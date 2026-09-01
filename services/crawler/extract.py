"""HTML -> title/meta/headings/links/images/OG/JSON-LD.

Output shape mirrors lib/scoring/types.ts (CrawledPage) so the same JSON
can flow Python -> Postgres -> the TypeScript scoring engine without a
translation layer. Uses only the standard library's html.parser, so this
module has zero third-party dependencies and can be unit tested fully
offline.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

HEADING_TAGS = {"h1", "h2", "h3"}
BLOCK_TAGS = {"p", "div", "li", "section", "article", "br"}


@dataclass
class ExtractedPage:
    title: str | None = None
    meta_description: str | None = None
    headings: dict = field(default_factory=lambda: {"h1": [], "h2": [], "h3": []})
    internal_links: list[str] = field(default_factory=list)
    external_links: list[str] = field(default_factory=list)
    images: list[dict] = field(default_factory=list)
    json_ld: list = field(default_factory=list)
    open_graph: dict = field(default_factory=dict)
    canonical: str | None = None
    has_viewport_meta: bool = False
    word_count: int = 0
    body_text: str = ""
    published_date: str | None = None
    author: str | None = None


class _PageParser(HTMLParser):
    def __init__(self, base_url: str):
        super().__init__(convert_charrefs=True)
        self.base_url = base_url
        self.base_host = urlparse(base_url).netloc

        self.page = ExtractedPage()
        self._text_chunks: list[str] = []
        self._body_chunks: list[str] = []
        self._current_tag_stack: list[str] = []
        self._in_script_jsonld = False
        self._jsonld_buffer = ""
        self._capture_heading: str | None = None
        self._heading_buffer = ""

    # -- tag handling -----------------------------------------------------

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        self._current_tag_stack.append(tag)

        if tag == "title":
            self._text_chunks.append("__TITLE_START__")

        elif tag == "meta":
            name = (attrs_dict.get("name") or "").lower()
            prop = (attrs_dict.get("property") or "").lower()
            content = attrs_dict.get("content") or ""

            if name == "description":
                self.page.meta_description = content
            elif name == "viewport":
                self.page.has_viewport_meta = True
            elif name == "author":
                self.page.author = content
            elif prop.startswith("og:"):
                self.page.open_graph[prop] = content
            elif name in ("article:published_time", "date") or prop == "article:published_time":
                self.page.published_date = content

        elif tag == "link":
            rel = (attrs_dict.get("rel") or "").lower()
            href = attrs_dict.get("href")
            if rel == "canonical" and href:
                self.page.canonical = urljoin(self.base_url, href)

        elif tag == "a":
            href = attrs_dict.get("href")
            if href and not href.startswith(("#", "mailto:", "tel:", "javascript:")):
                absolute = urljoin(self.base_url, href)
                if urlparse(absolute).netloc == self.base_host:
                    self.page.internal_links.append(absolute)
                else:
                    self.page.external_links.append(absolute)

        elif tag == "img":
            src = attrs_dict.get("src")
            if src:
                self.page.images.append({"src": urljoin(self.base_url, src), "alt": attrs_dict.get("alt")})

        elif tag in HEADING_TAGS:
            self._capture_heading = tag
            self._heading_buffer = ""

        elif tag == "script" and (attrs_dict.get("type") or "").lower() == "application/ld+json":
            self._in_script_jsonld = True
            self._jsonld_buffer = ""

        elif tag == "time":
            datetime_attr = attrs_dict.get("datetime")
            if datetime_attr and not self.page.published_date:
                self.page.published_date = datetime_attr

    def handle_endtag(self, tag):
        if self._current_tag_stack and self._current_tag_stack[-1] == tag:
            self._current_tag_stack.pop()

        if tag == "title" and self._text_chunks and "__TITLE_START__" in self._text_chunks:
            idx = self._text_chunks.index("__TITLE_START__")
            self.page.title = "".join(self._text_chunks[idx + 1 :]).strip() or None
            self._text_chunks = self._text_chunks[:idx]

        elif tag in HEADING_TAGS and self._capture_heading:
            text = re.sub(r"\s+", " ", self._heading_buffer).strip()
            if text:
                self.page.headings[tag].append(text)
            self._capture_heading = None

        elif tag == "script" and self._in_script_jsonld:
            self._in_script_jsonld = False
            try:
                parsed = json.loads(self._jsonld_buffer)
                self.page.json_ld.append(parsed)
            except json.JSONDecodeError:
                pass  # malformed JSON-LD is a real-world finding, not a crawler crash

        elif tag in BLOCK_TAGS:
            self._body_chunks.append("\n\n")

    def handle_data(self, data):
        if self._in_script_jsonld:
            self._jsonld_buffer += data
            return
        if "__TITLE_START__" in self._text_chunks or self._text_chunks and self._text_chunks[0] == "__TITLE_START__":
            pass
        if self._text_chunks and "__TITLE_START__" in self._text_chunks:
            self._text_chunks.append(data)
        if self._capture_heading:
            self._heading_buffer += data
        if self._current_tag_stack and self._current_tag_stack[-1] not in ("script", "style", "title"):
            self._body_chunks.append(data)


def extract_page(html: str, url: str) -> ExtractedPage:
    """Parse a single HTML document into an ExtractedPage."""
    parser = _PageParser(base_url=url)
    parser.feed(html)

    body_text = re.sub(r"[ \t]+", " ", "".join(parser._body_chunks))
    body_text = re.sub(r"\n{3,}", "\n\n", body_text).strip()
    parser.page.body_text = body_text
    parser.page.word_count = len(body_text.split())

    # De-duplicate links while preserving order.
    parser.page.internal_links = list(dict.fromkeys(parser.page.internal_links))
    parser.page.external_links = list(dict.fromkeys(parser.page.external_links))

    return parser.page
