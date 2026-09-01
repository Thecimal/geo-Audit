import type { KpiScore, ProjectData } from "../types";
import { component, insufficientEvidence, totalFromComponents, KPI_WEIGHTS, KPI_LABELS } from "../helpers";
import { countQuestionHeadings, firstSentence, pagesWithJsonLdType } from "../text-utils";

const KEY = "answer-readiness" as const;

export function scoreAnswerReadiness(data: ProjectData): KpiScore {
  const { pages } = data;
  const components = [];

  if (pages.length === 0) {
    return {
      key: KEY,
      label: KPI_LABELS[KEY],
      weight: KPI_WEIGHTS[KEY],
      score: 0,
      components: [insufficientEvidence("no-pages", "No pages crawled", 100, "Crawl returned zero pages")],
    };
  }

  // 1. FAQ content present (25)
  const faqPages = pagesWithJsonLdType(pages, "faqpage");
  const faqByHeading = pages.filter((p) =>
    [...p.headings.h1, ...p.headings.h2, ...p.headings.h3].some((h) => /faq|frequently asked/i.test(h))
  );
  const faqPts = faqPages.length > 0 ? 25 : faqByHeading.length > 0 ? 12 : 0;
  components.push(
    component("faq-content", "FAQ content present", faqPts, 25, [
      faqPages.length > 0
        ? `FAQPage schema found on ${faqPages.length} page(s)`
        : faqByHeading.length > 0
          ? `FAQ-style heading found on ${faqByHeading.length} page(s), but no FAQPage schema`
          : "No FAQ section or schema found on any page",
    ])
  );

  // 2. Direct-answer paragraphs — headings phrased as questions (25)
  const questionHeadingCounts = pages.map(countQuestionHeadings);
  const totalQuestionHeadings = questionHeadingCounts.reduce((a, b) => a + b, 0);
  const qPts = Math.min(25, totalQuestionHeadings * 4);
  components.push(
    component("question-headings", "Headings phrased as direct questions", qPts, 25, [
      totalQuestionHeadings > 0
        ? `${totalQuestionHeadings} question-phrased heading(s) across ${pages.length} page(s)`
        : "No headings phrased as questions found",
    ])
  );

  // 3. Heading structure clarity — every page has exactly one clear H1 (20)
  const pagesWithOneH1 = pages.filter((p) => p.headings.h1.length === 1);
  const h1Pts = Math.round((pagesWithOneH1.length / pages.length) * 20);
  components.push(
    component("heading-structure", "Clear single-H1 heading structure", h1Pts, 20, [
      `${pagesWithOneH1.length}/${pages.length} pages have exactly one H1`,
    ])
  );

  // 4. Content chunking — average paragraph/word density suggests scannable content (15)
  const pagesWithBody = pages.filter((p) => p.bodyText && p.bodyText.length > 0);
  if (pagesWithBody.length === 0) {
    components.push(insufficientEvidence("chunking", "Content is chunked, not walls of text", 15, "No extracted body text available to assess"));
  } else {
    const avgParaLen =
      pagesWithBody.reduce((sum, p) => {
        const paras = (p.bodyText as string).split(/\n{2,}/).filter(Boolean);
        const avg = paras.length > 0 ? (p.bodyText as string).length / paras.length : (p.bodyText as string).length;
        return sum + avg;
      }, 0) / pagesWithBody.length;
    // Shorter average "paragraph" length -> more scannable/AI-extractable.
    const chunkPts = avgParaLen < 400 ? 15 : avgParaLen < 800 ? 8 : 2;
    components.push(
      component("chunking", "Content is chunked, not walls of text", chunkPts, 15, [
        `Average paragraph length ~${Math.round(avgParaLen)} characters across ${pagesWithBody.length} page(s)`,
      ])
    );
  }

  // 5. Freshness signals — published/updated dates present (15)
  const pagesWithDate = pages.filter((p) => !!p.publishedDate);
  const freshPts = Math.round((pagesWithDate.length / pages.length) * 15);
  components.push(
    component("freshness", "Freshness signals (dates) present", freshPts, 15, [
      `${pagesWithDate.length}/${pages.length} pages expose a published or updated date`,
    ])
  );

  return {
    key: KEY,
    label: KPI_LABELS[KEY],
    weight: KPI_WEIGHTS[KEY],
    score: totalFromComponents(components),
    components,
  };
}

// Re-exported for the /audit page to show example first-sentence checks.
export { firstSentence };
