from dataclasses import dataclass

from services.crawler import pipeline, robots


@dataclass
class FakeResponse:
    status_code: int
    body: str


ROBOTS_TXT = """
User-agent: *
Disallow: /private
Sitemap: https://fakesite.test/sitemap.xml
"""

SITEMAP_XML = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://fakesite.test/</loc></url>
  <url><loc>https://fakesite.test/about</loc></url>
  <url><loc>https://fakesite.test/services</loc></url>
  <url><loc>https://fakesite.test/orphan-page</loc></url>
</urlset>
"""

HOME_HTML = """
<html><head><title>Fake Site</title>
<meta name="description" content="A fake site for testing."></head>
<body>
<h1>Welcome to Fake Site</h1>
<a href="/about">About</a>
<a href="/services">Services</a>
<a href="/private/secret">Secret</a>
<a href="/broken">Broken link</a>
</body></html>
"""

ABOUT_HTML = """
<html><head><title>Fake Site</title>
<meta name="description" content="About us."></head>
<body><h1>About</h1><a href="/">Home</a></body></html>
"""

SERVICES_HTML = """
<html><head><title>Services - Fake Site</title>
<meta name="description" content="Our services."></head>
<body>
<h1>Services</h1>
<a href="/about">About</a>
<script type="application/ld+json">{"@type": "Service", "name": "Widgets"}</script>
</body></html>
"""

ORPHAN_HTML = """
<html><head><title>Orphan Page</title></head>
<body><h1>Nobody links here</h1></body></html>
"""

PRIVATE_HTML = "<html><head><title>Secret</title></head><body>Should never be fetched</body></html>"

LLMS_TXT = "# fakesite.test\n\nThis site sells widgets."

FAKE_SITE = {
    "https://fakesite.test/robots.txt": FakeResponse(200, ROBOTS_TXT),
    "https://fakesite.test/sitemap.xml": FakeResponse(200, SITEMAP_XML),
    "https://fakesite.test/llms.txt": FakeResponse(200, LLMS_TXT),
    "https://fakesite.test/": FakeResponse(200, HOME_HTML),
    "https://fakesite.test/about": FakeResponse(200, ABOUT_HTML),
    "https://fakesite.test/services": FakeResponse(200, SERVICES_HTML),
    "https://fakesite.test/orphan-page": FakeResponse(200, ORPHAN_HTML),
    "https://fakesite.test/private/secret": FakeResponse(200, PRIVATE_HTML),
    "https://fakesite.test/broken": FakeResponse(404, ""),
}


def fake_fetch(url: str) -> FakeResponse:
    if url not in FAKE_SITE:
        raise ConnectionError(f"no such fake page: {url}")
    return FAKE_SITE[url]


def run_fake_crawl(**kwargs):
    return pipeline.crawl("https://fakesite.test/", fake_fetch, **kwargs)


class TestRobotsAndSitemapDiscovery:
    def test_finds_robots_txt(self):
        result = run_fake_crawl()
        assert result.robots_txt_found is True

    def test_finds_sitemap_via_robots_txt(self):
        result = run_fake_crawl()
        assert result.sitemap_found is True
        assert "https://fakesite.test/orphan-page" in result.sitemap_urls

    def test_finds_llms_txt(self):
        result = run_fake_crawl()
        assert result.llms_txt_found is True

    def test_missing_robots_and_llms_are_reported_false(self):
        site = {k: v for k, v in FAKE_SITE.items() if k not in ("https://fakesite.test/robots.txt", "https://fakesite.test/llms.txt")}

        def fetch(url):
            if url not in site:
                raise ConnectionError("missing")
            return site[url]

        result = pipeline.crawl("https://fakesite.test/", fetch)
        assert result.robots_txt_found is False
        assert result.llms_txt_found is False
        # No robots.txt sitemap directive and default /sitemap.xml is still present in `site`,
        # so sitemap discovery via the default path should still work.
        assert result.sitemap_found is True


class TestCrawlTraversal:
    def test_crawls_all_reachable_same_origin_pages(self):
        result = run_fake_crawl()
        urls = {p.url for p in result.pages}
        assert "https://fakesite.test/" in urls
        assert "https://fakesite.test/about" in urls
        assert "https://fakesite.test/services" in urls

    def test_respects_robots_disallow(self):
        result = run_fake_crawl()
        urls = {p.url for p in result.pages}
        assert "https://fakesite.test/private/secret" not in urls

    def test_ignoring_robots_reaches_disallowed_page(self):
        result = run_fake_crawl(respect_robots=False)
        urls = {p.url for p in result.pages}
        assert "https://fakesite.test/private/secret" in urls

    def test_extracts_content_correctly(self):
        result = run_fake_crawl()
        home = next(p for p in result.pages if p.url == "https://fakesite.test/")
        assert home.page.title == "Fake Site"
        assert home.page.meta_description == "A fake site for testing."
        assert home.page.headings["h1"] == ["Welcome to Fake Site"]

    def test_extracts_json_ld(self):
        result = run_fake_crawl()
        services = next(p for p in result.pages if p.url == "https://fakesite.test/services")
        assert services.page.json_ld == [{"@type": "Service", "name": "Widgets"}]

    def test_respects_max_pages(self):
        result = run_fake_crawl(max_pages=2)
        assert len(result.pages) <= 2

    def test_respects_max_depth(self):
        result = run_fake_crawl(max_depth=0)
        urls = {p.url for p in result.pages}
        # Only depth-0 pages: the start URL and any sitemap-seeded URLs.
        assert all(p.depth == 0 for p in result.pages)
        assert "https://fakesite.test/" in urls


class TestFindings:
    def test_detects_broken_link(self):
        result = run_fake_crawl()
        assert len(result.broken_links) == 1
        broken = result.broken_links[0]
        assert broken.to_url == "https://fakesite.test/broken"
        assert broken.status == 404
        assert broken.from_url == "https://fakesite.test/"

    def test_detects_orphan_page(self):
        result = run_fake_crawl()
        assert "https://fakesite.test/orphan-page" in result.orphan_pages
        # Pages that ARE linked internally must never be flagged as orphans.
        assert "https://fakesite.test/about" not in result.orphan_pages

    def test_start_url_is_never_an_orphan(self):
        result = run_fake_crawl()
        assert "https://fakesite.test/" not in result.orphan_pages

    def test_detects_duplicate_titles(self):
        result = run_fake_crawl()
        assert any(
            set(group) == {"https://fakesite.test/", "https://fakesite.test/about"} for group in result.duplicate_titles
        )

    def test_https_used_true_for_all_https_site(self):
        result = run_fake_crawl()
        assert result.https_used is True


class TestSerialization:
    def test_crawled_pages_to_json_matches_ts_shape(self):
        result = run_fake_crawl()
        pages_json = pipeline.crawled_pages_to_json(result)
        assert len(pages_json) == len(result.pages)
        expected_keys = {
            "url", "depth", "statusCode", "title", "metaDescription", "wordCount",
            "headings", "internalLinks", "externalLinks", "images", "jsonLd",
            "openGraph", "canonical", "hasViewportMeta", "bodyText", "publishedDate", "author",
        }
        assert expected_keys.issubset(pages_json[0].keys())

    def test_technical_findings_to_json_matches_ts_shape(self):
        result = run_fake_crawl()
        tf_json = pipeline.technical_findings_to_json(result)
        expected_keys = {
            "totalPages", "brokenLinks", "orphanPages", "duplicateTitles", "duplicateDescriptions",
            "robotsTxtFound", "sitemapFound", "sitemapUrls", "llmsTxtFound", "httpsUsed", "avgLoadTimeMs",
        }
        assert expected_keys.issubset(tf_json.keys())
        assert tf_json["totalPages"] == len(result.pages)
