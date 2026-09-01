import type { GeoScoreResult, KpiScoreComponent } from "../scoring/types";

export type IssueSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface DerivedIssue {
  id: string;
  kpiKey: string;
  kpiLabel: string;
  componentKey: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  /** 1-5, used by the Impact×Effort matrix. */
  impact: number;
  /** 1-5, used by the Impact×Effort matrix. */
  effort: number;
  evidence: string[];
}

/** How costly a fix for this component tends to be, independent of the KPI it's under. */
const EFFORT_BY_COMPONENT: Record<string, number> = {
  "org-name": 2,
  description: 2,
  industry: 1,
  "key-entities": 3,
  relationships: 3,
  nap: 2,
  "faq-content": 3,
  "question-headings": 2,
  "heading-structure": 2,
  chunking: 4,
  freshness: 2,
  "robots-txt": 1,
  sitemap: 2,
  noindex: 1,
  "no-orphans": 3,
  "llms-txt": 1,
  "author-info": 2,
  "outbound-citations": 2,
  "content-depth": 4,
  "about-page": 3,
  "jsonld-present": 3,
  "organization-schema": 2,
  "product-service-schema": 3,
  "faq-howto-schema": 3,
  "schema-validity": 2,
  "services-described": 3,
  "contact-complete": 1,
  "team-info": 3,
  positioning: 2,
  "social-profiles": 1,
  https: 3,
  "broken-links": 2,
  "load-time": 4,
  "viewport-meta": 2,
  "no-duplicates": 2,
  "nap-consistency": 2,
  "messaging-consistency": 2,
  "og-metadata": 1,
  "logo-schema": 1,
  "quotable-stats": 3,
  "clear-vp": 2,
  testimonials: 3,
};

function severityFor(gapRatio: number, weight: number): IssueSeverity {
  const weightedGap = gapRatio * weight;
  if (weightedGap >= 9) return "CRITICAL";
  if (weightedGap >= 5) return "HIGH";
  if (weightedGap >= 2) return "MEDIUM";
  return "LOW";
}

function impactFor(gapRatio: number, weight: number): number {
  // Bigger weight * bigger gap = more overall-score points on the table.
  const weightedGap = gapRatio * weight;
  if (weightedGap >= 9) return 5;
  if (weightedGap >= 6) return 4;
  if (weightedGap >= 3) return 3;
  if (weightedGap >= 1) return 2;
  return 1;
}

/**
 * Walk every KPI's components and turn any component that isn't fully
 * scored (and isn't insufficientEvidence — nothing to *do* about missing
 * off-site data) into a concrete, evidence-backed issue.
 */
export function deriveIssues(scoreResult: GeoScoreResult): DerivedIssue[] {
  const issues: DerivedIssue[] = [];

  for (const kpi of scoreResult.kpiScores) {
    for (const c of kpi.components as KpiScoreComponent[]) {
      if (c.insufficientEvidence) continue;
      if (c.points >= c.maxPoints) continue; // fully scored, nothing to fix

      const gapRatio = (c.maxPoints - c.points) / c.maxPoints;
      const effort = EFFORT_BY_COMPONENT[c.key] ?? 3;

      issues.push({
        id: `${kpi.key}__${c.key}`,
        kpiKey: kpi.key,
        kpiLabel: kpi.label,
        componentKey: c.key,
        title: c.label,
        description: describeGap(kpi.label, c),
        severity: severityFor(gapRatio, kpi.weight),
        impact: impactFor(gapRatio, kpi.weight),
        effort,
        evidence: c.evidence,
      });
    }
  }

  // Highest impact, lowest effort first — the natural "do this next" order.
  return issues.sort((a, b) => b.impact - a.impact || a.effort - b.effort);
}

function describeGap(kpiLabel: string, c: KpiScoreComponent): string {
  const pct = Math.round((c.points / c.maxPoints) * 100);
  return `Scoring ${pct}% on "${c.label}" under ${kpiLabel}. ${c.evidence[0] ?? ""}`.trim();
}
