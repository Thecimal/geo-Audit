import { describe, expect, it } from "vitest";
import { calculateOverallGeoScore } from "../index";
import { KPI_WEIGHTS } from "../helpers";
import { bestCaseProjectData, worstCaseProjectData } from "./fixtures";

describe("KPI_WEIGHTS", () => {
  it("sums to exactly 100", () => {
    const total = Object.values(KPI_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });
});

describe("calculateOverallGeoScore — determinism", () => {
  it("returns identical scores for identical input, computed twice", () => {
    const data = bestCaseProjectData();
    const dataClone = JSON.parse(JSON.stringify(data));

    const first = calculateOverallGeoScore(data);
    const second = calculateOverallGeoScore(dataClone);

    expect(second.overallScore).toBe(first.overallScore);
    expect(second.kpiScores.map((k) => k.score)).toEqual(first.kpiScores.map((k) => k.score));
  });

  it("does not mutate its input", () => {
    const data = bestCaseProjectData();
    const before = JSON.stringify(data);
    calculateOverallGeoScore(data);
    expect(JSON.stringify(data)).toBe(before);
  });
});

describe("calculateOverallGeoScore — monotonicity", () => {
  it("scores a strictly-better site no lower than a strictly-worse one, overall", () => {
    const worst = calculateOverallGeoScore(worstCaseProjectData());
    const best = calculateOverallGeoScore(bestCaseProjectData());

    expect(best.overallScore).toBeGreaterThan(worst.overallScore);
  });

  it("scores the better site no lower than the worse site, per KPI", () => {
    const worst = calculateOverallGeoScore(worstCaseProjectData());
    const best = calculateOverallGeoScore(bestCaseProjectData());

    const worstByKey = Object.fromEntries(worst.kpiScores.map((k) => [k.key, k.score]));
    const bestByKey = Object.fromEntries(best.kpiScores.map((k) => [k.key, k.score]));

    for (const key of Object.keys(worstByKey)) {
      expect(bestByKey[key]).toBeGreaterThanOrEqual(worstByKey[key]);
    }
  });

  it("adding a single positive signal never decreases the score of the KPI it affects", () => {
    const base = worstCaseProjectData();
    const improved = worstCaseProjectData();
    improved.technicalFindings.robotsTxtFound = true;
    improved.technicalFindings.sitemapFound = true;

    const baseScore = calculateOverallGeoScore(base);
    const improvedScore = calculateOverallGeoScore(improved);

    const baseDisc = baseScore.kpiScores.find((k) => k.key === "ai-discoverability")!;
    const improvedDisc = improvedScore.kpiScores.find((k) => k.key === "ai-discoverability")!;

    expect(improvedDisc.score).toBeGreaterThan(baseDisc.score);
    expect(improvedScore.overallScore).toBeGreaterThanOrEqual(baseScore.overallScore);
  });
});

describe("calculateOverallGeoScore — bounds", () => {
  it("keeps every KPI score and the overall score within [0, 100]", () => {
    for (const data of [worstCaseProjectData(), bestCaseProjectData()]) {
      const result = calculateOverallGeoScore(data);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      for (const kpi of result.kpiScores) {
        expect(kpi.score).toBeGreaterThanOrEqual(0);
        expect(kpi.score).toBeLessThanOrEqual(100);
        for (const c of kpi.components) {
          expect(c.points).toBeGreaterThanOrEqual(0);
          expect(c.points).toBeLessThanOrEqual(c.maxPoints);
        }
      }
    }
  });

  it("produces all nine KPIs every time", () => {
    const result = calculateOverallGeoScore(bestCaseProjectData());
    expect(result.kpiScores).toHaveLength(9);
    expect(new Set(result.kpiScores.map((k) => k.key)).size).toBe(9);
  });
});
