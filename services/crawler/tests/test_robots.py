from services.crawler import robots


class TestParseRobotsTxt:
    def test_parses_disallow_for_wildcard_agent(self):
        text = "User-agent: *\nDisallow: /admin\n"
        rules = robots.parse_robots_txt(text)
        assert rules.disallow == ["/admin"]

    def test_ignores_blocks_for_other_agents(self):
        text = "User-agent: BadBot\nDisallow: /everything\n\nUser-agent: *\nDisallow: /admin\n"
        rules = robots.parse_robots_txt(text)
        assert rules.disallow == ["/admin"]

    def test_grouped_user_agents_both_apply(self):
        text = "User-agent: GeoHealthBot\nUser-agent: *\nDisallow: /private\n"
        rules = robots.parse_robots_txt(text, user_agent="GeoHealthBot")
        assert rules.disallow == ["/private"]

    def test_sitemap_directive_captured_regardless_of_block(self):
        text = "User-agent: BadBot\nDisallow: /\nSitemap: https://example.com/sitemap.xml\n"
        rules = robots.parse_robots_txt(text)
        assert rules.sitemaps == ["https://example.com/sitemap.xml"]

    def test_comments_and_blank_lines_ignored(self):
        text = "# comment\nUser-agent: *\n\n# another comment\nDisallow: /x\n"
        rules = robots.parse_robots_txt(text)
        assert rules.disallow == ["/x"]

    def test_empty_disallow_means_allow_all(self):
        text = "User-agent: *\nDisallow:\n"
        rules = robots.parse_robots_txt(text)
        assert rules.disallow == []


class TestIsPathAllowed:
    def test_allows_everything_with_no_rules(self):
        rules = robots.RobotsRules()
        assert robots.is_path_allowed(rules, "/anything") is True

    def test_disallows_matching_prefix(self):
        rules = robots.RobotsRules(disallow=["/admin"])
        assert robots.is_path_allowed(rules, "/admin/users") is False
        assert robots.is_path_allowed(rules, "/public") is True

    def test_longer_allow_overrides_shorter_disallow(self):
        rules = robots.RobotsRules(disallow=["/admin"], allow=["/admin/public"])
        assert robots.is_path_allowed(rules, "/admin/public/page") is True
        assert robots.is_path_allowed(rules, "/admin/private") is False

    def test_wildcard_pattern(self):
        rules = robots.RobotsRules(disallow=["/*.pdf$"])
        assert robots.is_path_allowed(rules, "/files/report.pdf") is False
        assert robots.is_path_allowed(rules, "/files/report.pdf.html") is True


class TestParseSitemapXml:
    def test_parses_urlset(self):
        xml = """<?xml version="1.0"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url><loc>https://example.com/a</loc></url>
          <url><loc>https://example.com/b</loc></url>
        </urlset>"""
        urls = robots.parse_sitemap_xml(xml, "https://example.com/sitemap.xml")
        assert urls == ["https://example.com/a", "https://example.com/b"]

    def test_resolves_relative_locs_against_base(self):
        xml = """<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url><loc>/relative-page</loc></url>
        </urlset>"""
        urls = robots.parse_sitemap_xml(xml, "https://example.com/sitemap.xml")
        assert urls == ["https://example.com/relative-page"]

    def test_malformed_xml_returns_empty_list(self):
        assert robots.parse_sitemap_xml("<not valid xml", "https://example.com/") == []

    def test_sitemap_index_returns_child_sitemap_urls(self):
        xml = """<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <sitemap><loc>https://example.com/sitemap-1.xml</loc></sitemap>
        </sitemapindex>"""
        urls = robots.parse_sitemap_xml(xml, "https://example.com/sitemap.xml")
        assert urls == ["https://example.com/sitemap-1.xml"]
