import type { KpiScore, ProjectData } from "../types";
import { component, insufficientEvidence, totalFromComponents, KPI_WEIGHTS, KPI_LABELS } from "../helpers";
import { pagesWithJsonLdType } from "../text-utils";

const KEY = "brand-consistency" as const;

export function scoreBrandConsistency(data: ProjectData): KpiScore {
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

  // 1. Consistent NAP across pages (30) — approximated: does the company name
  // field carry a single confirmed value rather than conflicting candidates.
  const napPts = bp.companyName.status === "confirmed" ? 30 : bp.companyName.status === "inferred" ? 15 : 0;
  components.push(
    component("nap-consistency", "Consistent name/address/phone site-wide", napPts, 30, [
      bp.companyName.status === "confirmed"
        ? `Company name "${bp.companyName.value}" consistent across sources`
        : "Company name could not be confirmed consistently across pages",
    ])
  );

  // 2. Consistent messaging/tagline (30)
  const ogTitles = pages.map((p) => p.openGraph["og:site_name"]).filter(Boolean);
  const uniqueSiteNames = new Set(ogTitles);
  let messagingPts = 0;
  const messagingEvidence: string[] = [];
  if (ogTitles.length === 0) {
    messagingEvidence.push("No og:site_name found on any page to compare");
  } else if (uniqueSiteNames.size === 1) {
    messagingPts = 30;
    messagingEvidence.push(`og:site_name is consistently "${[...uniqueSiteNames][0]}" across ${ogTitles.length} page(s)`);
  } else {
    messagingPts = 10;
    messagingEvidence.push(`og:site_name varies across pages: ${[...uniqueSiteNames].join(", ")}`);
  }
  components.push(component("messaging-consistency", "Consistent brand name in page metadata", messagingPts, 30, messagingEvidence));

  // 3. Consistent OG/social metadata present (20)
  const pagesWithOg = pages.filter((p) => Object.keys(p.openGraph).length > 0);
  const ogPts = Math.round((pagesWithOg.length / pages.length) * 20);
  components.push(
    component("og-metadata", "Open Graph metadata present site-wide", ogPts, 20, [
      `${pagesWithOg.length}/${pages.length} pages declare Open Graph metadata`,
    ])
  );

  // 4. Logo/branding present in schema (20)
  const orgPages = pagesWithJsonLdType(pages, "organization");
  const hasLogo = orgPages.some((p) => p.jsonLd.some((b) => b && typeof b === "object" && "logo" in b));
  components.push(
    component("logo-schema", "Logo declared in Organization schema", hasLogo ? 20 : 0, 20, [
      hasLogo ? "logo field found in Organization schema" : "No logo field found in any Organization schema block",
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
