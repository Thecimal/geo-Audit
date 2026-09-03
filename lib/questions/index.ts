import "server-only";
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
 * Fallback used when VOYAGE_API_KEY isn't set, or the live embedding call
 * fails for any reason: a keyword-overlap heuristic, not a semantic
 * model. It checks how many of a question's meaningful terms show up on
 * each crawled page — good enough to flag obvious gaps, but blind to
 * paraphrase and synonymy (e.g. "How much does it cost?" vs. a page that
 * only ever says "pricing"). See `scoreQuestionCoverage` below for the
 * embedding-based path.
 */
export function scoreQuestionCoverageHeuristic(question: string, pages: CrawledPage[]): QuestionCoverage {
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

// --- Semantic scoring (embedding-based) ----------------------------------
//
// Voyage AI is Anthropic's recommended embeddings provider. When
// VOYAGE_API_KEY is set, questions and page content are embedded and
// compared by cosine similarity instead of literal term overlap, so a
// question like "How much does it cost?" can match a page that only ever
// says "pricing" or "plans start at". Any failure — no key, network
// error, timeout, malformed response — falls back to the keyword
// heuristic above, so this never throws and always returns a result.

const VOYAGE_MODEL = process.env.VOYAGE_MODEL ?? "voyage-3.5-lite";
const MAX_PAGE_CHARS = 4000; // bound embedding cost/tokens per page

// Per-process cache, keyed by exact text, so re-scoring the same default
// question set (or re-embedding the same crawled pages) across requests
// doesn't re-call the API every time. Not persistent — swap for a
// DB-backed cache once page/question embeddings have somewhere to live.
const embeddingCache = new Map<string, number[]>();

async function embedTexts(texts: string[], inputType: "query" | "document"): Promise<number[][] | null> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey || texts.length === 0) return null;

  const uncached = texts.filter((t) => !embeddingCache.has(`${inputType}:${t}`));

  try {
    if (uncached.length > 0) {
      const response = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model: VOYAGE_MODEL, input: uncached, input_type: inputType }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) return null;

      const data = (await response.json()) as { data?: { embedding: number[] }[] };
      if (!data.data || data.data.length !== uncached.length) return null;

      uncached.forEach((text, i) => embeddingCache.set(`${inputType}:${text}`, data.data![i].embedding));
    }

    return texts.map((t) => embeddingCache.get(`${inputType}:${t}`)!);
  } catch {
    return null;
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Scores how well a question is answered by the crawled pages. Uses
 * embedding-based semantic similarity when VOYAGE_API_KEY is configured;
 * otherwise (or on any live-call failure) falls back to
 * `scoreQuestionCoverageHeuristic`. Same return shape either way, so
 * callers never have to know which path ran.
 */
export async function scoreQuestionCoverage(question: string, pages: CrawledPage[]): Promise<QuestionCoverage> {
  if (pages.length === 0) {
    return { text: question, coverageScore: 0, answeredBy: [], gapSummary: "No page content available to check against." };
  }

  const pageTexts = pages.map((p) => pageText(p).slice(0, MAX_PAGE_CHARS));
  const [questionEmbedding] = (await embedTexts([question], "query")) ?? [null];
  const pageEmbeddings = questionEmbedding ? await embedTexts(pageTexts, "document") : null;

  if (!questionEmbedding || !pageEmbeddings) {
    return scoreQuestionCoverageHeuristic(question, pages);
  }

  const perPage = pages.map((page, i) => ({ page, similarity: cosineSimilarity(questionEmbedding, pageEmbeddings[i]) }));
  const best = perPage.reduce((a, b) => (b.similarity > a.similarity ? b : a));

  // Cosine similarity on real embeddings clusters much higher than raw
  // term overlap even for loosely-related text, so the "covered" cutoff
  // is correspondingly higher than the heuristic's 0.6.
  const COVERED_THRESHOLD = 0.75;
  const answeredBy = perPage.filter((p) => p.similarity >= COVERED_THRESHOLD).map((p) => p.page.url);
  const coverageScore = Math.round(Math.max(0, best.similarity) * 100) / 100;

  const gapSummary =
    coverageScore >= COVERED_THRESHOLD
      ? null
      : coverageScore > 0.4
        ? `Only a loose semantic match found (closest page: ${best.page.url}). Consider adding a section that directly answers this.`
        : `No crawled page semantically addresses this question. This is a coverage gap.`;

  return { text: question, coverageScore, answeredBy, gapSummary };
}
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
