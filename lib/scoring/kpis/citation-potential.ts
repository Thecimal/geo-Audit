import type { KpiScore, ProjectData } from "../types";
import { component, insufficientEvidence, totalFromComponents, KPI_WEIGHTS, KPI_LABELS } from "../helpers";

const KEY = "citation-potential" as const;

const STAT_PATTERN = /\b\d{1,3}(,\d{3})*(\.\d+)?%?\b/;
const TESTIMONIAL_HINTS = ["testimonial", "review", "quote", "case study"];

export function scoreCitationPotential(data: ProjectData): KpiScore {
  const { pages, businessProfile: bp } = data;
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

  // 1. Quotable stats/data present (30)
  const pagesWithStats = pages.filter((p) => p.bodyText && STAT_PATTERN.test(p.bodyText));
  const statPts = Math.round((pagesWithStats.length / pages.length) * 30);
  components.push(
    component("quotable-stats", "Quotable statistics or figures present", statPts, 30, [
      pagesWithStats.length > 0
        ? `Numeric figures found on ${pagesWithStats.length}/${pages.length} page(s)`
        : "No numeric statistics found in page content",
    ])
  );

  // 2. Clear unique value proposition stated (30)
  const vp = bp.valueProposition;
  const vpPts = vp.status === "confirmed" ? 30 : vp.status === "inferred" ? Math.round(30 * vp.confidence) : 0;
  components.push(
    component("clear-vp", "Clear, quotable value proposition", vpPts, 30, [
      vp.status !== "missing" ? `"${vp.value}"` : "No standalone value-proposition statement found",
    ])
  );

  // 3. Original research/data (20) — needs a way to distinguish original vs. cited data
  components.push(
    insufficientEvidence(
      "original-research",
      "Original research or proprietary data published",
      20,
      "Cannot distinguish originally-published research from restated third-party data using on-site signals alone"
    )
  );

  // 4. Expert quotes/testimonials present (20)
  const pagesWithTestimonials = pages.filter(
    (p) =>
      TESTIMONIAL_HINTS.some((hint) => p.url.toLowerCase().includes(hint)) ||
      [...p.headings.h1, ...p.headings.h2, ...p.headings.h3].some((h) => TESTIMONIAL_HINTS.some((hint) => h.toLowerCase().includes(hint)))
  );
  components.push(
    component("testimonials", "Expert quotes or testimonials present", pagesWithTestimonials.length > 0 ? 20 : 0, 20, [
      pagesWithTestimonials.length > 0
        ? `Testimonial or case-study content found on ${pagesWithTestimonials.length} page(s)`
        : "No testimonial or case-study content found",
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
