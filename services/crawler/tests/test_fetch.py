import socket
from unittest.mock import patch

import pytest

from services.crawler import fetch


def _addrinfo_for(ip: str):
    return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, 443))]


class TestIsPublicIp:
    def test_public_ip_is_allowed(self):
        with patch("socket.getaddrinfo", return_value=_addrinfo_for("93.184.216.34")):
            assert fetch._is_public_ip("example.com") is True

    def test_loopback_is_blocked(self):
        with patch("socket.getaddrinfo", return_value=_addrinfo_for("127.0.0.1")):
            assert fetch._is_public_ip("localhost") is False

    def test_private_rfc1918_is_blocked(self):
        with patch("socket.getaddrinfo", return_value=_addrinfo_for("10.0.0.5")):
            assert fetch._is_public_ip("internal.corp") is False

    def test_link_local_is_blocked(self):
        with patch("socket.getaddrinfo", return_value=_addrinfo_for("169.254.169.254")):
            # The classic cloud-metadata SSRF target.
            assert fetch._is_public_ip("metadata.internal") is False

    def test_dns_failure_raises_fetch_error(self):
        with patch("socket.getaddrinfo", side_effect=socket.gaierror("no such host")):
            with pytest.raises(fetch.FetchError):
                fetch._is_public_ip("does-not-resolve.invalid")


class TestValidateUrl:
    def test_rejects_non_http_scheme(self):
        with pytest.raises(fetch.FetchError, match="non-http"):
            fetch._validate_url("file:///etc/passwd")

    def test_rejects_url_with_no_hostname(self):
        with pytest.raises(fetch.FetchError, match="hostname"):
            fetch._validate_url("https://")

    def test_accepts_valid_public_https_url(self):
        with patch("socket.getaddrinfo", return_value=_addrinfo_for("93.184.216.34")):
            fetch._validate_url("https://example.com/page")  # should not raise

    def test_rejects_url_resolving_to_private_ip(self):
        with patch("socket.getaddrinfo", return_value=_addrinfo_for("192.168.1.1")):
            with pytest.raises(fetch.FetchError, match="non-public"):
                fetch._validate_url("https://internal.example/")
