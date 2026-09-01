"""BFS crawl orchestration.

crawl() takes its fetch function as a parameter rather than calling
fetch.safe_get directly, so the traversal logic is unit-testable against
an in-memory fake site with zero network access (see tests/test_pipeline.py).
Wire fetch.safe_get in for production; nothing else changes.
"""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from typing import Callable, Optional, Protocol
from urllib.parse import urljoin, urlparse

from . import robots as robots_mod
from .extract import ExtractedPage, extract_page


class FetchLike(Protocol):
    status_code: int
    body: bytes | str


FetchFn = Callable[[str], FetchLike]


@dataclass
class CrawledPageResult:
    url: str
    depth: int
    status_code: int
    page: ExtractedPage


@dataclass
class BrokenLink:
    from_url: str
    to_url: str
    status: int


@dataclass
class CrawlResult:
    pages: list[CrawledPageResult] = field(default_factory=list)
    broken_links: list[BrokenLink] = field(default_factory=list)
    orphan_pages: list[str] = field(default_factory=list)
    duplicate_titles: list[list[str]] = field(default_factory=list)
    duplicate_descriptions: list[list[str]] = field(default_factory=list)
    robots_txt_found: bool = False
    sitemap_found: bool = False
    sitemap_urls: list[str] = field(default_factory=list)
    llms_txt_found: bool = False
    https_used: bool = False


def _body_text(result: FetchLike) -> str:
    return result.body.decode("utf-8", errors="replace") if isinstance(result.body, bytes) else result.body


def _try_fetch(fetch_fn: FetchFn, url: str) -> Optional[FetchLike]:
    try:
        return fetch_fn(url)
    except Exception:
        return None


def crawl(
    start_url: str,
    fetch_fn: FetchFn,
    max_pages: int = 50,
    max_depth: int = 3,
    user_agent: str = "*",
    respect_robots: bool = True,
) -> CrawlResult:
    result = CrawlResult()
    origin = urlparse(start_url)
    host = origin.netloc

    # --- robots.txt -------------------------------------------------------
    robots_url = urljoin(start_url, "/robots.txt")
    robots_response = _try_fetch(fetch_fn, robots_url)
    rules = robots_mod.RobotsRules()
    if robots_response and robots_response.status_code == 200:
        result.robots_txt_found = True
        rules = robots_mod.parse_robots_txt(_body_text(robots_response), user_agent=user_agent)

    # --- sitemap.xml --------------------------------------------------------
    sitemap_candidates = rules.sitemaps or [urljoin(start_url, "/sitemap.xml")]
    for sitemap_url in sitemap_candidates:
        sitemap_response = _try_fetch(fetch_fn, sitemap_url)
        if sitemap_response and sitemap_response.status_code == 200:
            urls = robots_mod.parse_sitemap_xml(_body_text(sitemap_response), sitemap_url)
            if urls:
                result.sitemap_found = True
                result.sitemap_urls.extend(urls)

    # --- llms.txt -------------------------------------------------------
    llms_response = _try_fetch(fetch_fn, urljoin(start_url, "/llms.txt"))
    result.llms_txt_found = bool(llms_response and llms_response.status_code == 200)

    # --- BFS crawl ------------------------------------------------------
    # Seed the queue with the sitemap's URLs too, not just the start URL:
    # a page that's listed in the sitemap but never linked to internally
    # should still be crawled so it can be correctly flagged as an orphan
    # below, rather than silently never discovered.
    visited: set[str] = set()
    referenced_by: dict[str, set[str]] = {}  # url -> set of urls that link to it
    seeds = [start_url] + [u for u in result.sitemap_urls if u != start_url]
    queue: deque[tuple[str, int, Optional[str]]] = deque((u, 0, None) for u in seeds)
    all_https = True

    while queue and len(result.pages) < max_pages:
        url, depth, referrer = queue.popleft()

        if url in visited:
            continue
        if depth > max_depth:
            continue
        if urlparse(url).netloc != host:
            continue  # same-origin only
        path = urlparse(url).path or "/"
        if respect_robots and not robots_mod.is_path_allowed(rules, path):
            continue

        visited.add(url)
        if urlparse(url).scheme != "https":
            all_https = False

        response = _try_fetch(fetch_fn, url)
        if response is None:
            if referrer:
                result.broken_links.append(BrokenLink(from_url=referrer, to_url=url, status=0))
            continue

        if response.status_code >= 400:
            if referrer:
                result.broken_links.append(BrokenLink(from_url=referrer, to_url=url, status=response.status_code))
            continue

        page = extract_page(_body_text(response), url)
        result.pages.append(CrawledPageResult(url=url, depth=depth, status_code=response.status_code, page=page))

        for link in page.internal_links:
            referenced_by.setdefault(link, set()).add(url)
            if link not in visited:
                queue.append((link, depth + 1, url))

    result.https_used = all_https

    # --- orphan detection -------------------------------------------------
    crawled_urls = {p.url for p in result.pages}
    for p in result.pages:
        if p.url == start_url:
            continue
        if p.url not in referenced_by or not (referenced_by[p.url] & crawled_urls):
            result.orphan_pages.append(p.url)

    # --- duplicate detection ------------------------------------------------
    result.duplicate_titles = _find_duplicates(result.pages, lambda p: p.page.title)
    result.duplicate_descriptions = _find_duplicates(result.pages, lambda p: p.page.meta_description)

    return result


def _find_duplicates(pages: list[CrawledPageResult], key_fn) -> list[list[str]]:
    groups: dict[str, list[str]] = {}
    for p in pages:
        key = key_fn(p)
        if not key:
            continue
        groups.setdefault(key, []).append(p.url)
    return [urls for urls in groups.values() if len(urls) > 1]


# ---------------------------------------------------------------------------
# Serialization matching lib/scoring/types.ts, so this JSON can be persisted
# and consumed by the TypeScript scoring engine with no translation layer.
# ---------------------------------------------------------------------------


def crawled_pages_to_json(result: CrawlResult) -> list[dict]:
    return [
        {
            "url": p.url,
            "depth": p.depth,
            "statusCode": p.status_code,
            "title": p.page.title,
            "metaDescription": p.page.meta_description,
            "wordCount": p.page.word_count,
            "headings": p.page.headings,
            "internalLinks": p.page.internal_links,
            "externalLinks": p.page.external_links,
            "images": p.page.images,
            "jsonLd": p.page.json_ld,
            "openGraph": p.page.open_graph,
            "canonical": p.page.canonical,
            "hasViewportMeta": p.page.has_viewport_meta,
            "bodyText": p.page.body_text,
            "publishedDate": p.page.published_date,
            "author": p.page.author,
        }
        for p in result.pages
    ]


def technical_findings_to_json(result: CrawlResult) -> dict:
    return {
        "totalPages": len(result.pages),
        "brokenLinks": [{"from": b.from_url, "to": b.to_url, "status": b.status} for b in result.broken_links],
        "orphanPages": result.orphan_pages,
        "duplicateTitles": result.duplicate_titles,
        "duplicateDescriptions": result.duplicate_descriptions,
        "robotsTxtFound": result.robots_txt_found,
        "sitemapFound": result.sitemap_found,
        "sitemapUrls": result.sitemap_urls,
        "llmsTxtFound": result.llms_txt_found,
        "httpsUsed": result.https_used,
        "avgLoadTimeMs": None,  # safe_get reports elapsed_ms per page; wire in when persisting real crawls
    }
