import type { KpiScoreComponent } from "./types";

/**
 * Fixed weights for the nine GEO KPIs. Sums to 100 — enforced by the
 * determinism/monotonicity test suite in __tests__/scoring.test.ts.
 */
export const KPI_WEIGHTS = {
  "entity-clarity": 14,
  "answer-readiness": 14,
  "ai-discoverability": 12,
  "content-authority": 12,
  "structured-data": 12,
  "knowledge-coverage": 12,
  "technical-accessibility": 10,
  "brand-consistency": 8,
  "citation-potential": 6,
} as const;

export type KpiKey = keyof typeof KPI_WEIGHTS;

export const KPI_LABELS: Record<KpiKey, string> = {
  "entity-clarity": "Entity Clarity",
  "answer-readiness": "Answer Readiness",
  "ai-discoverability": "AI Discoverability",
  "content-authority": "Content Authority",
  "structured-data": "Structured Data",
  "knowledge-coverage": "Knowledge Coverage",
  "technical-accessibility": "Technical Accessibility",
  "brand-consistency": "Brand Consistency",
  "citation-potential": "Citation Potential",
};

/**
 * Build a scored component. Points are clamped to [0, maxPoints] so a
 * miscounted heuristic can never push a KPI out of its valid range.
 */
export function component(
  key: string,
  label: string,
  points: number,
  maxPoints: number,
  evidence: string[]
): KpiScoreComponent {
  return {
    key,
    label,
    points: Math.max(0, Math.min(points, maxPoints)),
    maxPoints,
    evidence,
  };
}

/**
 * Mark a component as unscoreable rather than guessing a number — "avoid
 * fake precision" (spec section 7). insufficientEvidence components are
 * excluded from the denominator in totalFromComponents(), not counted as 0.
 */
export function insufficientEvidence(
  key: string,
  label: string,
  maxPoints: number,
  reason: string
): KpiScoreComponent {
  return {
    key,
    label,
    points: 0,
    maxPoints,
    evidence: [reason],
    insufficientEvidence: true,
  };
}

/**
 * Roll a KPI's components up into a single 0-100 score.
 *
 * Components with insufficientEvidence are excluded from both numerator and
 * denominator, so a page missing unrelated data isn't penalized for it — the
 * KPI is scored on what could actually be evaluated. If every component is
 * unscoreable, the KPI itself is 0 (nothing to show).
 */
export function totalFromComponents(components: KpiScoreComponent[]): number {
  const scoreable = components.filter((c) => !c.insufficientEvidence);
  if (scoreable.length === 0) return 0;
  const earned = scoreable.reduce((sum, c) => sum + c.points, 0);
  const possible = scoreable.reduce((sum, c) => sum + c.maxPoints, 0);
  if (possible === 0) return 0;
  return Math.round((earned / possible) * 100);
}
