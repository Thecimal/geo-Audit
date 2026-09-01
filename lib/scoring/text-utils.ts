import type { CrawledPage } from "./types";

/** Flatten a page's JSON-LD into a list of `@type` strings (handles @graph). */
export function jsonLdTypes(page: CrawledPage): string[] {
  const types: string[] = [];
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    const obj = node as Record<string, unknown>;
    if (obj["@graph"]) visit(obj["@graph"]);
    const t = obj["@type"];
    if (typeof t === "string") types.push(t.toLowerCase());
    if (Array.isArray(t)) t.forEach((x) => typeof x === "string" && types.push(x.toLowerCase()));
  };
  page.jsonLd.forEach(visit);
  return types;
}

export function pagesWithJsonLdType(pages: CrawledPage[], type: string): CrawledPage[] {
  const needle = type.toLowerCase();
  return pages.filter((p) => jsonLdTypes(p).includes(needle));
}

export function anyPageHasJsonLd(pages: CrawledPage[]): boolean {
  return pages.some((p) => p.jsonLd.length > 0);
}

/** Very small heuristic: does this look like a question a person would type into an AI chat? */
export function isQuestionLike(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.endsWith("?")) return true;
  return /^(what|why|how|when|where|who|which|can|does|do|is|are)\b/.test(t);
}

export function countQuestionHeadings(page: CrawledPage): number {
  const all = [...page.headings.h1, ...page.headings.h2, ...page.headings.h3];
  return all.filter(isQuestionLike).length;
}

/** Rough sentence splitter — good enough for "does the first sentence answer the heading" checks. */
export function firstSentence(text: string): string {
  const match = text.match(/^[^.!?]*[.!?]/);
  return (match ? match[0] : text).trim();
}

export function findPageByPath(pages: CrawledPage[], pathFragment: string): CrawledPage | undefined {
  return pages.find((p) => p.url.toLowerCase().includes(pathFragment.toLowerCase()));
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function isInternalLinkGraphConnected(
  pages: CrawledPage[],
  orphanPages: string[]
): boolean {
  return orphanPages.length === 0 && pages.length > 0;
}
