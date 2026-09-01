// Shared types for the deterministic scoring engine.
//
// These mirror the shape produced by services/crawler/pipeline.py so the
// same JSON can flow Python -> Postgres -> here with no translation layer
// (see architecture.md, section 4).

export type FieldStatus = "confirmed" | "inferred" | "missing";

/** Every discovered fact about a business carries the same four-part shape. */
export interface FieldValue<T> {
  value: T;
  confidence: number; // 0-1
  source: string; // URL or "inferred"
  status: FieldStatus;
}

export interface BusinessProfileData {
  companyName: FieldValue<string>;
  tagline: FieldValue<string>;
  description: FieldValue<string>;
  industry: FieldValue<string>;
  foundedYear: FieldValue<number | null>;
  headquarters: FieldValue<string>;
  services: FieldValue<string[]>;
  targetAudience: FieldValue<string>;
  valueProposition: FieldValue<string>;
  phone: FieldValue<string>;
  email: FieldValue<string>;
  socialProfiles: FieldValue<string[]>;
}

export type EntityType =
  | "ORGANIZATION"
  | "PERSON"
  | "PRODUCT"
  | "SERVICE"
  | "LOCATION"
  | "TOPIC";

export interface EntityData {
  id: string;
  name: string;
  type: EntityType;
  description?: string | null;
  confidence: number;
  sourceUrl?: string | null;
}

export interface EntityRelationshipData {
  id: string;
  fromEntityId: string;
  toEntityId: string;
  relationType: string;
}

export interface HeadingSet {
  h1: string[];
  h2: string[];
  h3: string[];
}

export interface PageImage {
  src: string;
  alt: string | null;
}

export interface CrawledPage {
  url: string;
  depth: number;
  statusCode: number;
  title: string | null;
  metaDescription: string | null;
  wordCount: number;
  headings: HeadingSet;
  internalLinks: string[];
  externalLinks: string[];
  images: PageImage[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jsonLd: any[];
  openGraph: Record<string, string>;
  canonical: string | null;
  hasViewportMeta: boolean;
  bodyText?: string; // first N chars, used by content-quality heuristics
  publishedDate?: string | null;
  author?: string | null;
}

export interface BrokenLink {
  from: string;
  to: string;
  status: number;
}

export interface TechnicalFindings {
  totalPages: number;
  brokenLinks: BrokenLink[];
  orphanPages: string[];
  duplicateTitles: string[][];
  duplicateDescriptions: string[][];
  robotsTxtFound: boolean;
  sitemapFound: boolean;
  sitemapUrls: string[];
  llmsTxtFound: boolean;
  httpsUsed: boolean;
  avgLoadTimeMs: number | null;
}

/** Everything the scoring engine needs. Read-only, fully serializable. */
export interface ProjectData {
  projectUrl: string;
  crawledAt: string;
  pages: CrawledPage[];
  technicalFindings: TechnicalFindings;
  businessProfile: BusinessProfileData;
  entities: EntityData[];
  relationships: EntityRelationshipData[];
}

// ---------------------------------------------------------------------------
// Scoring output
// ---------------------------------------------------------------------------

/** A single named, evidence-backed piece of a KPI. */
export interface KpiScoreComponent {
  key: string;
  label: string;
  /** Points earned out of `maxPoints`. Omitted (0) when insufficientEvidence. */
  points: number;
  maxPoints: number;
  evidence: string[];
  insufficientEvidence?: boolean;
}

export interface KpiScore {
  key: string;
  label: string;
  weight: number; // out of 100, see KPI_WEIGHTS
  score: number; // 0-100, this KPI's own score
  components: KpiScoreComponent[];
}

export interface GeoScoreResult {
  overallScore: number; // 0-100
  kpiScores: KpiScore[];
  computedAt: string;
}
