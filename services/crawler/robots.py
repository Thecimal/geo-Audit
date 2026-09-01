"""robots.txt + sitemap.xml parsing.

Pure functions, no I/O — pipeline.py fetches the text (via fetch.safe_get)
and hands it to these functions. Kept separate from fetch.py so parsing
logic can be unit tested with hand-written strings instead of live
responses.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from urllib.parse import urljoin
from xml.etree import ElementTree


@dataclass
class RobotsRules:
    disallow: list[str] = field(default_factory=list)
    allow: list[str] = field(default_factory=list)
    sitemaps: list[str] = field(default_factory=list)


def parse_robots_txt(text: str, user_agent: str = "*") -> RobotsRules:
    """Parse robots.txt, keeping only rules that apply to `user_agent` or `*`.

    Minimal but correct for the common case: sequential User-agent blocks,
    Allow/Disallow directives, and Sitemap directives (which apply
    globally regardless of which User-agent block they appear under).
    """
    rules = RobotsRules()
    applicable_agents = {user_agent.lower(), "*"}
    current_agents: list[str] = []
    in_relevant_block = False

    for raw_line in text.splitlines():
        line = raw_line.split("#", 1)[0].strip()
        if not line:
            continue
        if ":" not in line:
            continue
        key, _, value = line.partition(":")
        key = key.strip().lower()
        value = value.strip()

        if key == "user-agent":
            # A new User-agent line starts a new block unless the previous
            # line was also a User-agent line (grouped agents).
            if current_agents and not in_relevant_block:
                current_agents = []
            current_agents.append(value.lower())
            in_relevant_block = any(a in applicable_agents for a in current_agents)
        elif key == "disallow" and in_relevant_block:
            if value:
                rules.disallow.append(value)
            # An empty Disallow means "allow everything" — nothing to record.
        elif key == "allow" and in_relevant_block:
            if value:
                rules.allow.append(value)
        elif key == "sitemap":
            rules.sitemaps.append(value)
        elif key not in ("crawl-delay",):
            continue

    return rules


def is_path_allowed(rules: RobotsRules, path: str) -> bool:
    """Longest-matching-rule wins, per the de facto robots.txt standard.

    Allow and Disallow rules are compared by matched-prefix length; ties
    favor Allow (the more permissive rule), matching common crawler
    behavior (e.g. Google's).
    """
    best_disallow_len = -1
    best_allow_len = -1

    for pattern in rules.disallow:
        if _matches(path, pattern) and len(pattern) > best_disallow_len:
            best_disallow_len = len(pattern)
    for pattern in rules.allow:
        if _matches(path, pattern) and len(pattern) > best_allow_len:
            best_allow_len = len(pattern)

    if best_disallow_len == -1:
        return True
    return best_allow_len >= best_disallow_len


def _matches(path: str, pattern: str) -> bool:
    if not pattern:
        return False
    # robots.txt patterns: '*' wildcard, '$' end-of-string anchor.
    regex = re.escape(pattern).replace(r"\*", ".*")
    if regex.endswith(r"\$"):
        regex = regex[:-2] + "$"
    return re.match(regex, path) is not None


SITEMAP_NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}


def parse_sitemap_xml(xml_text: str, base_url: str) -> list[str]:
    """Extract absolute page URLs from a <urlset> or <sitemapindex> document.

    Sitemap-index entries are returned as-is (their own URLs) rather than
    recursively fetched — the caller decides whether to follow them.
    """
    try:
        root = ElementTree.fromstring(xml_text)
    except ElementTree.ParseError:
        return []

    tag = root.tag.split("}")[-1]
    urls: list[str] = []

    if tag in ("urlset", "sitemapindex"):
        child_tag = "url" if tag == "urlset" else "sitemap"
        for entry in root.findall(f"sm:{child_tag}", SITEMAP_NS) or root.findall(child_tag):
            loc = entry.find("sm:loc", SITEMAP_NS)
            if loc is None:
                loc = entry.find("loc")
            if loc is not None and loc.text:
                urls.append(urljoin(base_url, loc.text.strip()))

    return urls
