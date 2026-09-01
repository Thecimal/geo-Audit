import type { KpiScore, ProjectData } from "../types";
import { component, insufficientEvidence, totalFromComponents, KPI_WEIGHTS, KPI_LABELS } from "../helpers";
import { findPageByPath, hostnameOf } from "../text-utils";

const KEY = "content-authority" as const;

export function scoreContentAuthority(data: ProjectData): KpiScore {
  const { pages, projectUrl } = data;
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

  // 1. Author/byline info present (20)
  const pagesWithAuthor = pages.filter((p) => !!p.author);
  const authorPts = Math.round((pagesWithAuthor.length / pages.length) * 20);
  components.push(
    component("author-info", "Author or byline information present", authorPts, 20, [
      `${pagesWithAuthor.length}/${pages.length} pages attribute content to a named author`,
    ])
  );

  // 2. Outbound citations to authoritative external sources (20)
  const ownHost = hostnameOf(projectUrl);
  const externalLinkCount = pages.reduce((sum, p) => sum + p.externalLinks.filter((l) => hostnameOf(l) !== ownHost).length, 0);
  const citationPts = Math.min(20, externalLinkCount * 2);
  components.push(
    component("outbound-citations", "Cites authoritative external sources", citationPts, 20, [
      externalLinkCount > 0
        ? `${externalLinkCount} outbound link(s) to external domains found`
        : "No outbound citations to external sources found",
    ])
  );

  // 3. Content depth — sufficient word count on primary pages (20)
  const avgWordCount = pages.reduce((sum, p) => sum + p.wordCount, 0) / pages.length;
  const depthPts = avgWordCount >= 600 ? 20 : avgWordCount >= 300 ? 12 : avgWordCount >= 100 ? 5 : 0;
  components.push(
    component("content-depth", "Sufficient content depth per page", depthPts, 20, [
      `Average word count across crawled pages: ${Math.round(avgWordCount)}`,
    ])
  );

  // 4. About/credentials page present (20)
  const aboutPage = findPageByPath(pages, "/about") || findPageByPath(pages, "/team");
  components.push(
    component("about-page", "About or credentials page present", aboutPage ? 20 : 0, 20, [
      aboutPage ? `About/team page found at ${aboutPage.url}` : "No dedicated About or Team page found",
    ])
  );

  // 5. External backlink / mention signals (20) — needs an off-site data source this build doesn't have
  components.push(
    insufficientEvidence(
      "backlinks",
      "External backlink and mention signals",
      20,
      "Requires a backlink index or brand-mention API — not available from on-site crawl data alone"
    )
  );

  return {
    key: KEY,
    label: KPI_LABELS[KEY],
    weight: KPI_WEIGHTS[KEY],
    score: totalFromComponents(components),
    components,
  };
}
