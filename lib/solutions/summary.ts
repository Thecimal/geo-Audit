import type { GeoScoreResult } from "../scoring/types";

/**
 * Template-based, deterministic — same LLM seam as generateSolution() in
 * ./generate.ts. Grounded entirely in the computed KPI scores, no free
 * generation, so it never says anything the scoring engine can't back up.
 */
export function generateOverviewSummary(displayName: string, result: GeoScoreResult): string {
  const sorted = [...result.kpiScores].sort((a, b) => b.score - a.score);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];
  const overall = result.overallScore;

  const band = overall >= 70 ? "reads clearly to AI answer engines" : overall >= 40 ? "is partially legible to AI answer engines" : "is largely invisible to AI answer engines";

  return `${displayName} ${band}, scoring ${overall}/100 overall. ${strongest.label} is the strongest signal at ${strongest.score}/100, while ${weakest.label} is the biggest gap at ${weakest.score}/100 — closing it is the highest-leverage next step.`;
}
