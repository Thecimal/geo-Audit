import type { KpiScore, ProjectData } from "../types";
import { component, totalFromComponents, KPI_WEIGHTS, KPI_LABELS } from "../helpers";

const KEY = "knowledge-coverage" as const;

export function scoreKnowledgeCoverage(data: ProjectData): KpiScore {
  const { businessProfile: bp, entities } = data;
  const components = [];

  // 1. Services/products fully described (25)
  const serviceCount = bp.services.value?.length ?? 0;
  const serviceEntities = entities.filter((e) => e.type === "SERVICE" || e.type === "PRODUCT");
  const svcPts = serviceCount === 0 ? 0 : Math.min(25, serviceCount * 5 + Math.min(10, serviceEntities.length * 2));
  components.push(
    component("services-described", "Services / products fully described", svcPts, 25, [
      serviceCount > 0
        ? `${serviceCount} service(s)/product(s) listed: ${(bp.services.value || []).slice(0, 4).join(", ")}`
        : "No services or products listed anywhere on the site",
    ])
  );

  // 2. Location/contact info complete (20)
  const contactFields = [bp.headquarters, bp.phone, bp.email];
  const foundContact = contactFields.filter((f) => f.status !== "missing").length;
  components.push(
    component("contact-complete", "Location & contact info complete", Math.round((foundContact / 3) * 20), 20, [
      `${foundContact}/3 of headquarters, phone, and email found`,
    ])
  );

  // 3. Team/people info (15)
  const peopleEntities = entities.filter((e) => e.type === "PERSON");
  const peoplePts = Math.min(15, peopleEntities.length * 5);
  components.push(
    component("team-info", "Team / people information present", peoplePts, 15, [
      peopleEntities.length > 0
        ? `${peopleEntities.length} named people identified: ${peopleEntities
            .slice(0, 4)
            .map((e) => e.name)
            .join(", ")}`
        : "No named people found on the site",
    ])
  );

  // 4. Value proposition / positioning info (20)
  const vpField = bp.valueProposition;
  const audField = bp.targetAudience;
  let posPts = 0;
  const posEvidence: string[] = [];
  if (vpField.status !== "missing") {
    posPts += 12;
    posEvidence.push(`Value proposition found: "${vpField.value}"`);
  } else {
    posEvidence.push("No clear value proposition found");
  }
  if (audField.status !== "missing") {
    posPts += 8;
    posEvidence.push(`Target audience identified: "${audField.value}"`);
  } else {
    posEvidence.push("No target audience signal found");
  }
  components.push(component("positioning", "Value proposition & audience described", posPts, 20, posEvidence));

  // 5. Social profiles linked (20)
  const socialCount = bp.socialProfiles.value?.length ?? 0;
  components.push(
    component("social-profiles", "Social profiles linked", Math.min(20, socialCount * 5), 20, [
      socialCount > 0 ? `${socialCount} social profile(s) linked` : "No social profile links found",
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
