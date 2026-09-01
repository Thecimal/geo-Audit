import type { KpiScore, ProjectData } from "../types";
import { component, insufficientEvidence, totalFromComponents, KPI_WEIGHTS, KPI_LABELS } from "../helpers";

const KEY = "entity-clarity" as const;

export function scoreEntityClarity(data: ProjectData): KpiScore {
  const { businessProfile, entities, relationships } = data;
  const components = [];

  // 1. Organization name found and confident (20)
  const nameField = businessProfile.companyName;
  if (nameField.status === "missing") {
    components.push(
      insufficientEvidence("org-name", "Organization name identified", 20, "No company name found on any crawled page")
    );
  } else {
    const pts = nameField.status === "confirmed" ? 20 : Math.round(20 * nameField.confidence);
    components.push(
      component("org-name", "Organization name identified", pts, 20, [
        `"${nameField.value}" found via ${nameField.source} (${nameField.status}, confidence ${Math.round(nameField.confidence * 100)}%)`,
      ])
    );
  }

  // 2. Description/tagline present and complete (15)
  const descField = businessProfile.description;
  const taglineField = businessProfile.tagline;
  const descLen = (descField.value || "").length;
  const hasTagline = (taglineField.value || "").length > 0;
  let descPts = 0;
  const descEvidence: string[] = [];
  if (descLen >= 50) {
    descPts += 10;
    descEvidence.push(`Description is ${descLen} characters (source: ${descField.source})`);
  } else if (descLen > 0) {
    descPts += 5;
    descEvidence.push(`Description found but short (${descLen} characters)`);
  } else {
    descEvidence.push("No business description found");
  }
  if (hasTagline) {
    descPts += 5;
    descEvidence.push(`Tagline: "${taglineField.value}"`);
  } else {
    descEvidence.push("No tagline detected");
  }
  components.push(component("description", "Description & tagline present", descPts, 15, descEvidence));

  // 3. Industry/category identified (15)
  const industryField = businessProfile.industry;
  if (industryField.status === "missing") {
    components.push(insufficientEvidence("industry", "Industry / category identified", 15, "No industry signal found"));
  } else {
    const pts = industryField.status === "confirmed" ? 15 : Math.round(15 * industryField.confidence);
    components.push(
      component("industry", "Industry / category identified", pts, 15, [
        `Classified as "${industryField.value}" (${industryField.status})`,
      ])
    );
  }

  // 4. Key entities (products/services) extracted (25)
  const productOrServiceEntities = entities.filter((e) => e.type === "PRODUCT" || e.type === "SERVICE");
  const entityPts = Math.min(25, productOrServiceEntities.length * 5);
  components.push(
    component("key-entities", "Products / services extracted as entities", entityPts, 25, [
      productOrServiceEntities.length > 0
        ? `${productOrServiceEntities.length} product/service entities identified: ${productOrServiceEntities
            .slice(0, 5)
            .map((e) => e.name)
            .join(", ")}`
        : "No product or service entities extracted",
    ])
  );

  // 5. Entity relationships mapped (15)
  const relPts = Math.min(15, relationships.length * 3);
  components.push(
    component("relationships", "Entity relationships mapped", relPts, 15, [
      relationships.length > 0
        ? `${relationships.length} relationships mapped between entities`
        : "No relationships mapped between entities",
    ])
  );

  // 6. NAP (name/address/phone) consistency (10)
  const hasAddress = businessProfile.headquarters.status !== "missing";
  const hasPhone = businessProfile.phone.status !== "missing";
  const napFieldsFound = [hasAddress, hasPhone].filter(Boolean).length;
  components.push(
    component("nap", "Name / address / phone present", napFieldsFound * 5, 10, [
      `Headquarters: ${hasAddress ? businessProfile.headquarters.value : "not found"}`,
      `Phone: ${hasPhone ? businessProfile.phone.value : "not found"}`,
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
