import type { CrawledPage } from "../scoring/types";

export interface QuestionCoverage {
  text: string;
  coverageScore: number; // 0-1
  answeredBy: string[]; // page URLs
  gapSummary: string | null;
}

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "do", "does", "what", "how", "why", "when",
  "where", "who", "which", "can", "you", "your", "to", "of", "for", "in",
  "on", "with", "and", "or", "it", "this", "that", "i", "we", "my",
]);

function keywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[?.,!]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function pageText(page: CrawledPage): string {
  const parts = [
    page.title ?? "",
    page.metaDescription ?? "",
    ...page.headings.h1,
    ...page.headings.h2,
    ...page.headings.h3,
    page.bodyText ?? "",
  ];
  return parts.join(" ").toLowerCase();
}

/**
 * A lightweight keyword-overlap heuristic, not a semantic model: it checks
 * how many of a question's meaningful terms show up on each crawled page.
 * Good enough to flag obvious coverage gaps; not a substitute for a real
 * embedding-based match (see architecture.md section 8 on the LLM seam).
 */
export function scoreQuestionCoverage(question: string, pages: CrawledPage[]): QuestionCoverage {
  const terms = keywords(question);
  if (terms.length === 0 || pages.length === 0) {
    return { text: question, coverageScore: 0, answeredBy: [], gapSummary: "No page content available to check against." };
  }

  const perPage = pages.map((p) => {
    const text = pageText(p);
    const hits = terms.filter((t) => text.includes(t)).length;
    return { page: p, ratio: hits / terms.length };
  });

  const best = perPage.reduce((a, b) => (b.ratio > a.ratio ? b : a));
  const answeredBy = perPage.filter((p) => p.ratio >= 0.6).map((p) => p.page.url);

  const coverageScore = Math.round(best.ratio * 100) / 100;
  const gapSummary =
    coverageScore >= 0.6
      ? null
      : coverageScore > 0
        ? `Only partial term overlap found (best match: ${best.page.url}). Consider adding a section that directly answers this.`
        : `No crawled page mentions the key terms in this question. This is a coverage gap.`;

  return { text: question, coverageScore, answeredBy, gapSummary };
}

/** A small starter set of questions a prospective customer might ask an AI assistant. */
export function defaultQuestionSet(companyName: string, industry: string): string[] {
  return [
    `What does ${companyName} do?`,
    `Who is ${companyName} for?`,
    `How much does ${companyName} cost?`,
    `Is ${companyName} a good ${industry} option?`,
    `Where is ${companyName} located?`,
    `How do I contact ${companyName}?`,
  ];
}
