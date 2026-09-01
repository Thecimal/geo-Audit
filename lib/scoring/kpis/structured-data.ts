import type { KpiScore, ProjectData } from "../types";
import { component, totalFromComponents, KPI_WEIGHTS, KPI_LABELS } from "../helpers";
import { anyPageHasJsonLd, jsonLdTypes, pagesWithJsonLdType } from "../text-utils";

const KEY = "structured-data" as const;

const REQUIRED_ORG_FIELDS = ["name", "url"];

export function scoreStructuredData(data: ProjectData): KpiScore {
  const { pages } = data;
  const components = [];

  // 1. JSON-LD present at all (25)
  const anyJsonLd = anyPageHasJsonLd(pages);
  const pagesWithAny = pages.filter((p) => p.jsonLd.length > 0);
  components.push(
    component("jsonld-present", "JSON-LD structured data present", anyJsonLd ? 25 : 0, 25, [
      anyJsonLd
        ? `JSON-LD found on ${pagesWithAny.length}/${pages.length} pages`
        : "No JSON-LD structured data found on any crawled page",
    ])
  );

  // 2. Organization schema present and reasonably complete (20)
  const orgPages = pagesWithJsonLdType(pages, "organization");
  let orgPts = 0;
  const orgEvidence: string[] = [];
  if (orgPages.length === 0) {
    orgEvidence.push("No Organization schema found");
  } else {
    orgPts += 10;
    orgEvidence.push(`Organization schema found on ${orgPages.length} page(s)`);
    const flatFields = new Set<string>();
    orgPages.forEach((p) =>
      p.jsonLd.forEach((block) => {
        if (block && typeof block === "object") Object.keys(block).forEach((k) => flatFields.add(k.toLowerCase()));
      })
    );
    const missing = REQUIRED_ORG_FIELDS.filter((f) => !flatFields.has(f));
    if (missing.length === 0) {
      orgPts += 10;
      orgEvidence.push("Required fields (name, url) present");
    } else {
      orgEvidence.push(`Missing recommended fields: ${missing.join(", ")}`);
    }
  }
  components.push(component("organization-schema", "Organization schema present & complete", orgPts, 20, orgEvidence));

  // 3. Product/Service schema present (20)
  const productPages = pagesWithJsonLdType(pages, "product");
  const servicePages = pagesWithJsonLdType(pages, "service");
  const psPages = new Set([...productPages, ...servicePages].map((p) => p.url));
  const psPts = psPages.size > 0 ? 20 : 0;
  components.push(
    component("product-service-schema", "Product / Service schema present", psPts, 20, [
      psPages.size > 0
        ? `Product or Service schema found on ${psPages.size} page(s)`
        : "No Product or Service schema found on any page",
    ])
  );

  // 4. FAQ/HowTo schema present (20)
  const faqPages = pagesWithJsonLdType(pages, "faqpage");
  const howtoPages = pagesWithJsonLdType(pages, "howto");
  const richPages = new Set([...faqPages, ...howtoPages].map((p) => p.url));
  components.push(
    component("faq-howto-schema", "FAQ / HowTo schema present", richPages.size > 0 ? 20 : 0, 20, [
      richPages.size > 0
        ? `FAQPage or HowTo schema found on ${richPages.size} page(s)`
        : "No FAQPage or HowTo schema found",
    ])
  );

  // 5. Schema validation — no pages with malformed / empty JSON-LD blocks (15)
  const malformedPages = pages.filter((p) => p.jsonLd.some((b) => !b || typeof b !== "object" || jsonLdTypes({ ...p, jsonLd: [b] } as any).length === 0));
  const validPts = pages.length === 0 ? 0 : Math.round(((pages.length - malformedPages.length) / pages.length) * 15);
  components.push(
    component("schema-validity", "No schema validation errors", validPts, 15, [
      malformedPages.length > 0
        ? `${malformedPages.length} page(s) have a JSON-LD block missing a resolvable @type`
        : "All JSON-LD blocks found declare a valid @type",
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
