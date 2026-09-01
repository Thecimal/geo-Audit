import type { KpiScore, ProjectData } from "../types";
import { component, totalFromComponents, KPI_WEIGHTS, KPI_LABELS } from "../helpers";

const KEY = "ai-discoverability" as const;

export function scoreAiDiscoverability(data: ProjectData): KpiScore {
  const { technicalFindings: tf, pages } = data;
  const components = [];

  // 1. robots.txt present and not blocking everything (20)
  components.push(
    component("robots-txt", "robots.txt found and permissive", tf.robotsTxtFound ? 20 : 0, 20, [
      tf.robotsTxtFound ? "robots.txt found" : "No robots.txt found at /robots.txt",
    ])
  );

  // 2. sitemap.xml present and valid (20)
  components.push(
    component("sitemap", "sitemap.xml found and valid", tf.sitemapFound ? 20 : 0, 20, [
      tf.sitemapFound
        ? `sitemap.xml found with ${tf.sitemapUrls.length} URL(s) listed`
        : "No sitemap.xml found or referenced from robots.txt",
    ])
  );

  // 3. No noindex on key pages (20) — approximated via openGraph/meta absence of robots=noindex
  const noindexPages = pages.filter((p) => (p.openGraph["robots"] || "").toLowerCase().includes("noindex"));
  const noindexPts = pages.length === 0 ? 0 : Math.round(((pages.length - noindexPages.length) / pages.length) * 20);
  components.push(
    component("noindex", "Key pages are indexable", noindexPts, 20, [
      noindexPages.length > 0
        ? `${noindexPages.length}/${pages.length} pages carry a noindex directive`
        : `No noindex directives found across ${pages.length} crawled page(s)`,
    ])
  );

  // 4. Crawlable internal linking, no orphans (20)
  const orphanCount = tf.orphanPages.length;
  const orphanPts = pages.length === 0 ? 0 : Math.max(0, 20 - orphanCount * 4);
  components.push(
    component("no-orphans", "No orphaned pages in the link graph", orphanPts, 20, [
      orphanCount > 0
        ? `${orphanCount} orphan page(s) found with no internal links pointing to them`
        : "All crawled pages are reachable via internal links",
    ])
  );

  // 5. llms.txt / AI-access file present (20) — emerging GEO-specific signal
  components.push(
    component("llms-txt", "llms.txt (AI access file) present", tf.llmsTxtFound ? 20 : 0, 20, [
      tf.llmsTxtFound
        ? "llms.txt found, giving AI crawlers a curated content map"
        : "No llms.txt found — AI crawlers fall back to guessing site structure",
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
