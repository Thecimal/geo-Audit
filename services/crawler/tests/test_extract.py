from services.crawler.extract import extract_page

BASE_URL = "https://example.com/page"


def test_extracts_title():
    page = extract_page("<html><head><title>Hello World</title></head><body></body></html>", BASE_URL)
    assert page.title == "Hello World"


def test_extracts_meta_description():
    html = '<html><head><meta name="description" content="A great page."></head></html>'
    page = extract_page(html, BASE_URL)
    assert page.meta_description == "A great page."


def test_extracts_viewport_meta():
    html = '<html><head><meta name="viewport" content="width=device-width"></head></html>'
    page = extract_page(html, BASE_URL)
    assert page.has_viewport_meta is True


def test_extracts_headings_by_level():
    html = "<body><h1>Main</h1><h2>Sub A</h2><h2>Sub B</h2><h3>Detail</h3></body>"
    page = extract_page(html, BASE_URL)
    assert page.headings["h1"] == ["Main"]
    assert page.headings["h2"] == ["Sub A", "Sub B"]
    assert page.headings["h3"] == ["Detail"]


def test_classifies_internal_vs_external_links():
    html = '<body><a href="/about">About</a><a href="https://other.com/x">Other</a></body>'
    page = extract_page(html, BASE_URL)
    assert page.internal_links == ["https://example.com/about"]
    assert page.external_links == ["https://other.com/x"]


def test_ignores_anchor_mailto_and_javascript_links():
    html = '<body><a href="#top">Top</a><a href="mailto:a@b.com">Mail</a><a href="javascript:void(0)">JS</a></body>'
    page = extract_page(html, BASE_URL)
    assert page.internal_links == []
    assert page.external_links == []


def test_extracts_images_with_alt_text():
    html = '<body><img src="/logo.png" alt="Logo"></body>'
    page = extract_page(html, BASE_URL)
    assert page.images == [{"src": "https://example.com/logo.png", "alt": "Logo"}]


def test_extracts_valid_json_ld():
    html = '<script type="application/ld+json">{"@type": "Organization", "name": "Acme"}</script>'
    page = extract_page(html, BASE_URL)
    assert page.json_ld == [{"@type": "Organization", "name": "Acme"}]


def test_malformed_json_ld_is_skipped_not_crashed():
    html = '<script type="application/ld+json">{not valid json}</script>'
    page = extract_page(html, BASE_URL)
    assert page.json_ld == []


def test_extracts_open_graph_tags():
    html = '<meta property="og:title" content="Acme"><meta property="og:site_name" content="Acme Inc">'
    page = extract_page(html, BASE_URL)
    assert page.open_graph == {"og:title": "Acme", "og:site_name": "Acme Inc"}


def test_extracts_canonical_link():
    html = '<link rel="canonical" href="/canonical-page">'
    page = extract_page(html, BASE_URL)
    assert page.canonical == "https://example.com/canonical-page"


def test_computes_word_count_from_body_text():
    html = "<body><p>one two three four five</p></body>"
    page = extract_page(html, BASE_URL)
    assert page.word_count == 5


def test_deduplicates_repeated_links():
    html = '<body><a href="/a">1</a><a href="/a">2</a></body>'
    page = extract_page(html, BASE_URL)
    assert page.internal_links == ["https://example.com/a"]
