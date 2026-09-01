import type { GeoScoreResult, KpiScore, ProjectData } from "./types";
import { scoreEntityClarity } from "./kpis/entity-clarity";
import { scoreAnswerReadiness } from "./kpis/answer-readiness";
import { scoreAiDiscoverability } from "./kpis/ai-discoverability";
import { scoreContentAuthority } from "./kpis/content-authority";
import { scoreStructuredData } from "./kpis/structured-data";
import { scoreKnowledgeCoverage } from "./kpis/knowledge-coverage";
import { scoreTechnicalAccessibility } from "./kpis/technical-accessibility";
import { scoreBrandConsistency } from "./kpis/brand-consistency";
import { scoreCitationPotential } from "./kpis/citation-potential";

export * from "./types";
export * from "./helpers";

/**
 * The only function that should ever produce a GEO score. Nothing in the UI
 * computes or hardcodes one — every page renders this function's output.
 *
 * Pure and deterministic: identical `ProjectData` in ⇒ identical
 * `GeoScoreResult` out. See __tests__/scoring.test.ts.
 */
export function calculateOverallGeoScore(data: ProjectData): GeoScoreResult {
  const kpiScores: KpiScore[] = [
    scoreEntityClarity(data),
    scoreAnswerReadiness(data),
    scoreAiDiscoverability(data),
    scoreContentAuthority(data),
    scoreStructuredData(data),
    scoreKnowledgeCoverage(data),
    scoreTechnicalAccessibility(data),
    scoreBrandConsistency(data),
    scoreCitationPotential(data),
  ];

  const weightedSum = kpiScores.reduce((sum, k) => sum + (k.score * k.weight) / 100, 0);
  const totalWeight = kpiScores.reduce((sum, k) => sum + k.weight, 0);
  const overallScore = totalWeight === 0 ? 0 : Math.round((weightedSum / totalWeight) * 100);

  return {
    overallScore,
    kpiScores,
    computedAt: new Date().toISOString(),
  };
}
