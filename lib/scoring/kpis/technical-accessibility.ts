import type { KpiScore, ProjectData } from "../types";
import { component, insufficientEvidence, totalFromComponents, KPI_WEIGHTS, KPI_LABELS } from "../helpers";

const KEY = "technical-accessibility" as const;

export function scoreTechnicalAccessibility(data: ProjectData): KpiScore {
  const { technicalFindings: tf, pages } = data;
  const components = [];

  // 1. HTTPS used (20)
  components.push(
    component("https", "Site served over HTTPS", tf.httpsUsed ? 20 : 0, 20, [
      tf.httpsUsed ? "All crawled pages served over HTTPS" : "Site is not fully served over HTTPS",
    ])
  );

  // 2. No broken links (25)
  const brokenPts = pages.length === 0 ? 0 : Math.max(0, 25 - tf.brokenLinks.length * 3);
  components.push(
    component("broken-links", "No broken internal links", brokenPts, 25, [
      tf.brokenLinks.length > 0
        ? `${tf.brokenLinks.length} broken link(s) found, e.g. ${tf.brokenLinks[0].from} → ${tf.brokenLinks[0].to} (${tf.brokenLinks[0].status})`
        : "No broken internal links found during crawl",
    ])
  );

  // 3. Page load performance (15) — this build's crawler doesn't measure real timing
  if (tf.avgLoadTimeMs == null) {
    components.push(
      insufficientEvidence("load-time", "Page load performance", 15, "Crawler does not currently measure page load timing")
    );
  } else {
    const loadPts = tf.avgLoadTimeMs < 1000 ? 15 : tf.avgLoadTimeMs < 2500 ? 9 : 3;
    components.push(
      component("load-time", "Page load performance", loadPts, 15, [`Average load time ${tf.avgLoadTimeMs}ms`])
    );
  }

  // 4. Mobile viewport meta tag present (20)
  const pagesWithViewport = pages.filter((p) => p.hasViewportMeta);
  const viewportPts = pages.length === 0 ? 0 : Math.round((pagesWithViewport.length / pages.length) * 20);
  components.push(
    component("viewport-meta", "Mobile viewport meta tag present", viewportPts, 20, [
      `${pagesWithViewport.length}/${pages.length} pages declare a viewport meta tag`,
    ])
  );

  // 5. No duplicate titles/descriptions (20)
  const dupCount = tf.duplicateTitles.length + tf.duplicateDescriptions.length;
  const dupPts = Math.max(0, 20 - dupCount * 4);
  components.push(
    component("no-duplicates", "No duplicate titles or meta descriptions", dupPts, 20, [
      dupCount > 0
        ? `${tf.duplicateTitles.length} duplicate title group(s), ${tf.duplicateDescriptions.length} duplicate description group(s)`
        : "No duplicate titles or meta descriptions found",
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
