import "server-only";
import type { ProjectData, GeoScoreResult, CrawledPage, TechnicalFindings, BusinessProfileData, EntityData, EntityRelationshipData } from "../scoring/types";
import { calculateOverallGeoScore } from "../scoring";
import { deriveIssues, type DerivedIssue } from "../recommendations";
import { generateSolution, type GeneratedSolution } from "../solutions/generate";

import meta from "./fixtures/example-inc.meta.json";
import pages from "./fixtures/example-inc.pages.json";
import technicalFindings from "./fixtures/example-inc.technical.json";
import businessProfile from "./fixtures/example-inc.profile.json";
import entityData from "./fixtures/example-inc.entities.json";
import history from "./fixtures/example-inc.history.json";

export interface HistoricalSnapshot {
  id: string;
  createdAt: string;
  overallScore: number;
  kpiScores: { key: string; score: number }[];
}

export interface ProjectView {
  id: string;
  url: string;
  displayName: string;
  crawledAt: string;
  data: ProjectData;
  score: GeoScoreResult;
  issues: DerivedIssue[];
  history: HistoricalSnapshot[];
}

/**
 * The single seam a real implementation replaces with a database query
 * (see architecture.md section 5 — this becomes GET /api/projects/:id and
 * friends once a database and auth are in place). Everything downstream
 * — every page in app/ — only ever calls this function or getIssueSolution
 * below, never touches the fixture files directly.
 */
export async function getProject(): Promise<ProjectView> {
  const data: ProjectData = {
    projectUrl: meta.projectUrl,
    crawledAt: meta.crawledAt,
    pages: pages as unknown as CrawledPage[],
    technicalFindings: technicalFindings as unknown as TechnicalFindings,
    businessProfile: businessProfile as unknown as BusinessProfileData,
    entities: entityData.entities as unknown as EntityData[],
    relationships: entityData.relationships as unknown as EntityRelationshipData[],
  };

  const score = calculateOverallGeoScore(data);
  const issues = deriveIssues(score);

  return {
    id: "example-inc",
    url: meta.projectUrl,
    displayName: meta.displayName,
    crawledAt: meta.crawledAt,
    data,
    score,
    issues,
    history: history as unknown as HistoricalSnapshot[],
  };
}

export async function getIssueSolution(issueId: string): Promise<{ issue: DerivedIssue; solution: GeneratedSolution } | null> {
  const project = await getProject();
  const issue = project.issues.find((i) => i.id === issueId);
  if (!issue) return null;
  return { issue, solution: generateSolution(issue, project.data) };
}
