"""SSRF-safe, timeout- and size-bounded HTTP GET.

This module is the one place in the crawler that actually touches the
network. Every other module (robots, extract, pipeline) is pure and
testable without it — pipeline.crawl() takes a fetch function as a
parameter instead of importing safe_get directly, so traversal logic can
be tested against an in-memory fake with zero network access. Wire
safe_get in for production; nothing else changes.
"""

from __future__ import annotations

import ipaddress
import socket
import urllib.request
import urllib.error
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlparse

DEFAULT_TIMEOUT_SECONDS = 10
DEFAULT_MAX_BYTES = 5_000_000  # 5MB cap per page
DEFAULT_MAX_REDIRECTS = 5
USER_AGENT = "GeoHealthBot/1.0 (+https://www.exampleinc.com/bot)"


class FetchError(Exception):
    """Raised for any fetch failure: network, SSRF block, size cap, etc."""


@dataclass
class FetchResult:
    url: str  # final URL after redirects
    status_code: int
    headers: dict
    body: bytes
    elapsed_ms: int


def _is_public_ip(host: str) -> bool:
    """Resolve `host` and reject anything that isn't a public, routable address.

    Blocks loopback, link-local, private (RFC1918), multicast, and
    reserved ranges — the standard SSRF defenses for a server-side
    fetcher that accepts user-supplied URLs.
    """
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror as exc:
        raise FetchError(f"DNS resolution failed for {host}: {exc}") from exc

    for family, _, _, _, sockaddr in infos:
        ip_str = sockaddr[0]
        ip = ipaddress.ip_address(ip_str)
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        ):
            return False
    return True


def _validate_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise FetchError(f"Refusing non-http(s) scheme: {parsed.scheme!r}")
    if not parsed.hostname:
        raise FetchError("URL has no hostname")
    if not _is_public_ip(parsed.hostname):
        raise FetchError(f"Refusing to fetch non-public address for host {parsed.hostname!r}")


class _BoundedRedirectHandler(urllib.request.HTTPRedirectHandler):
    def __init__(self, max_redirects: int):
        self.max_redirects = max_redirects
        self.redirect_count = 0

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        self.redirect_count += 1
        if self.redirect_count > self.max_redirects:
            raise FetchError(f"Exceeded max redirects ({self.max_redirects})")
        _validate_url(newurl)  # re-validate on every hop, not just the first
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def safe_get(
    url: str,
    timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS,
    max_bytes: int = DEFAULT_MAX_BYTES,
    max_redirects: int = DEFAULT_MAX_REDIRECTS,
) -> FetchResult:
    """Fetch `url` with SSRF protection, a timeout, and a response-size cap.

    Raises FetchError for any failure. Never follows redirects to a
    non-public address, and stops reading a response once max_bytes is hit
    rather than buffering an unbounded body in memory.
    """
    import time

    _validate_url(url)
    start = time.monotonic()

    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    opener = urllib.request.build_opener(_BoundedRedirectHandler(max_redirects))

    try:
        with opener.open(request, timeout=timeout_seconds) as response:
            chunks = []
            total = 0
            while True:
                chunk = response.read(65536)
                if not chunk:
                    break
                total += len(chunk)
                if total > max_bytes:
                    raise FetchError(f"Response exceeded {max_bytes} byte cap")
                chunks.append(chunk)
            body = b"".join(chunks)
            elapsed_ms = int((time.monotonic() - start) * 1000)
            return FetchResult(
                url=response.geturl(),
                status_code=response.status,
                headers=dict(response.headers.items()),
                body=body,
                elapsed_ms=elapsed_ms,
            )
    except urllib.error.HTTPError as exc:
        elapsed_ms = int((time.monotonic() - start) * 1000)
        return FetchResult(
            url=url,
            status_code=exc.code,
            headers=dict(exc.headers.items()) if exc.headers else {},
            body=b"",
            elapsed_ms=elapsed_ms,
        )
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise FetchError(f"Fetch failed for {url}: {exc}") from exc
