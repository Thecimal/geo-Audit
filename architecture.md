# Architecture

## 1. System overview

```
Frontend (Next.js/TS)
    ↓
API layer (Next.js route handlers)
    ↓
Crawler Service (Python — services/crawler)
    ↓
Extraction Pipeline (services/crawler/extract.py)
    ↓
Knowledge Graph / Website Model (Prisma: BusinessProfile, Entity, EntityRelationship)
    ↓
Rule-Based GEO Analyzer (lib/scoring — deterministic)
    ↓
AI Semantic Analyzer (LLM call — see section 8; lib/solutions/generate.ts is wired to a live call, gated on ANTHROPIC_API_KEY)
    ↓
Scoring Engine (lib/scoring)
    ↓
Recommendation Engine (lib/recommendations)
    ↓
Solution Generator (lib/solutions)
    ↓
Persistence Layer (Postgres via Prisma — prisma/schema.prisma)
```

Deterministic analysis (HTTP, robots, sitemap, schema validation, metadata,
link analysis, page counts, score calculations) is kept entirely separate
from AI-assisted analysis (semantic entity interpretation, content quality
judgment, question generation, solution drafting). The dividing line in
this codebase is: **anything in `lib/scoring/` never calls an LLM.** Every
score is a sum of `KpiScoreComponent`s that can be recomputed from stored
data — see `lib/scoring/helpers.ts` → `totalFromComponents()`.

## 2. Database schema

See `prisma/schema.prisma` for the full, runnable schema. Design choices:

- **`FieldValue<T>` is stored as JSON, not columns**, on `BusinessProfile`
  (e.g. `companyName: Json`) because every discovered fact needs the same
  four-part shape — value, confidence, source, status — and modeling that
  as a join table per field would multiply table count for no query
  benefit at this stage. `Entity` + `EntityRelationship` are true rows
  (not JSON) because the Knowledge page needs to query and render a graph.
- **`AuditSnapshot` rows are immutable** — a new one is inserted per audit
  run, never updated in place, so History can show real before/after
  diffs and nothing silently loses data (spec requirement: "never
  overwrite historical audit results").
- **`Issue` and `Recommendation` are separate models** joined 1:1, because
  an issue is a *finding* (detected, evidence-backed, always present once
  scored) while a `Recommendation` is *generated content* (may not exist
  yet, may be regenerated, has its own `SolutionKind`).
- **`Implementation` is its own table**, not a status enum column alone,
  because "verified" needs to reference the specific `CrawlRun` that
  verified it — that traceability (`Detected → Reviewed → In Progress →
  Implemented → Verified`) is a spec requirement (section 20).

## 3. GEO KPI scoring model

Nine KPIs, each 0–100, combined into the overall score by fixed weights
(`lib/scoring/helpers.ts` → `KPI_WEIGHTS`, sums to 100):

| KPI | Weight |
|---|---|
| Entity Clarity | 14 |
| Answer Readiness | 14 |
| AI Discoverability | 12 |
| Content Authority | 12 |
| Structured Data | 12 |
| Knowledge Coverage | 12 |
| Technical Accessibility | 10 |
| Brand Consistency | 8 |
| Citation Potential | 6 |

Each KPI is itself a sum of 5–7 named sub-components (each with its own
point weight summing to 100 for that KPI) — see `lib/scoring/kpis/*.ts`.
Every component carries an `evidence: string[]` array and, when there
isn't enough data to score it confidently, `insufficientEvidence: true`
instead of a guessed number (`lib/scoring/helpers.ts` →
`insufficientEvidence()`). This is what section 7 of the brief calls
"avoid fake precision."

`calculateOverallGeoScore()` in `lib/scoring/index.ts` is the *only*
function that should ever produce a GEO score — nothing in the UI computes
or hardcodes one. This is unit tested in
`lib/scoring/__tests__/scoring.test.ts`, including a monotonicity test
(a strictly-better site never scores lower than a strictly-worse one) and
a determinism test (identical input ⇒ identical output).

## 4. Crawler pipeline

`services/crawler/` is a standalone Python package:

```
fetch.py     SSRF-safe, timeout- and size-bounded HTTP GET
robots.py    robots.txt + sitemap.xml parsing (pure functions, no I/O)
extract.py   HTML → title/meta/headings/links/images/OG/JSON-LD
pipeline.py  BFS crawl orchestration, robots-aware, same-origin,
             bounded by max_pages/max_depth; detects broken links,
             orphan pages, duplicate titles/descriptions
```

`pipeline.crawl()` takes its fetch function as a parameter rather than
calling `fetch.safe_get` directly, so the traversal logic is unit-testable
against an in-memory fake site with zero network access (see
`services/crawler/tests/test_pipeline.py`). Wire `fetch.safe_get` in for
production; nothing else changes.

Output shape mirrors `lib/scoring/types.ts` (`CrawledPage`,
`TechnicalFindings`) so the same JSON can flow from Python → Postgres →
the TypeScript scoring engine without a translation layer.

## 5. API structure (for a production deployment)

```
POST   /api/projects                      create a project from a URL
GET    /api/projects/:id                  project summary
POST   /api/projects/:id/crawl            enqueue a crawl run
GET    /api/projects/:id/crawl/:runId     crawl run status
GET    /api/projects/:id/audit            latest AuditSnapshot + KPIs
GET    /api/projects/:id/issues           filterable issue list
PATCH  /api/projects/:id/issues/:issueId  update status
POST   /api/projects/:id/issues/:issueId/solution   generate/regenerate a fix
GET    /api/projects/:id/knowledge        BusinessProfile + entity graph
GET    /api/projects/:id/questions        AI question coverage
POST   /api/projects/:id/questions        add a custom question
GET    /api/projects/:id/history          AuditSnapshot list
```

This build implements the equivalent reads as direct server-component
data access (`lib/data/getProject.ts`) rather than HTTP route handlers,
since there's one demo project and no auth session to scope requests to.
The route table above is what `getProject.ts` should become once a
database and auth are in place — see "What's real vs. simulated" in
the README.

## 6. Frontend routes

```
/                  Landing — URL input, animated discovery pipeline
/onboarding        Smart onboarding wizard
/overview          GEO Health, KPI grid, top problems/actions
/audit             Full KPI breakdown with evidence
/issues            Filterable/sortable issue list
/actions           Impact×Effort matrix + AI solution generator
/knowledge         Website Knowledge Profile + entity relationships
/questions         AI search question simulation
/technical         Crawl graph + technical findings
/schema            Structured data analyzer
/history           Score trend, before/after, crawl history
/settings          Project & crawl configuration
```

## 7. Component structure

```
components/
  ui/            Badge, Card, ScoreGauge (signature gauge + mini variant),
                 ConfidenceMeter, EvidenceChip — the design system primitives
  Sidebar.tsx, TopBar.tsx           dashboard chrome
  KpiCard.tsx, IssuesExplorer.tsx, ActionsBoard.tsx, ImpactEffortMatrix.tsx,
  QuestionsBoard.tsx, RelationshipChain.tsx, CrawlTree.tsx, HistoryChart.tsx,
  OnboardingWizard.tsx, LandingHero.tsx      feature components, one per page concern
lib/
  scoring/       deterministic KPI calculators + types (no LLM calls)
  recommendations/  turns score gaps into evidence-grounded Issue[]
  solutions/     generates concrete fixes (JSON-LD, copy, FAQ, outlines)
  questions/     lightweight coverage heuristic for user-added questions
  data/          getProject() — the single seam between fixtures and a real DB
```

## 8. AI Semantic Analyzer — the LLM seam

`generateSolution(issue, project)` in `lib/solutions/generate.ts` calls the
live Anthropic API (`ANTHROPIC_API_KEY`, read server-side only, never
exposed to the browser) to draft each fix's body, using a prompt built
from `issue.evidence`, the relevant `KnowledgeProfile` fields, and the
source page content. If the key isn't set, the call fails, or it times
out, it falls back to the original deterministic template
(`generateTemplateSolution`) so this never throws or returns empty
content. Everything downstream (Copy/Download/Regenerate buttons, the
panel UI) is unchanged either way.

`generateOverviewSummary()` in `lib/solutions/summary.ts` (the
plain-language line on `/overview`) is deliberately **not** wired to a
live call, unlike the above — it's a one-sentence readout entirely
derived from already-computed KPI scores, so making it non-deterministic
would only add latency and cost for no benefit. It stays template-based
by design, not because a seam is missing.

## 9. Assumptions made for this build

1. **No live crawling of arbitrary URLs.** This sandboxed environment's
   network is restricted to package registries — it cannot fetch
   arbitrary external websites. `lib/data/getProject.ts` reads a
   realistic fixture (`lib/data/fixtures/example-inc.*.json`) standing in
   for real crawl output, through the one function that a real
   implementation would replace with a database query.
2. **No live Postgres instance.** `prisma/schema.prisma` is complete and
   ready to migrate (`npx prisma migrate dev`), but nothing in the app
   queries it yet — see #1.
3. **No auth.** Single-tenant demo. `User`/`ProjectMember`/`AuditLog`
   exist in the schema for when this is needed; not wired into routes.
4. **Live LLM calls are conditional, not absent.** `generateSolution()`
   calls the Anthropic API when `ANTHROPIC_API_KEY` is set in the
   deployment environment; this repo ships with no key configured, so a
   fresh checkout still runs template-only until one is added. See
   section 8.
5. **shadcn/ui was not installed via its CLI** (would need network access
   to fetch component source); instead the design system is a small set
   of hand-rolled primitives in `components/ui/` using the same Tailwind
   + Radix-free approach, easy to swap in shadcn components later without
   changing any page.
6. Fonts (Space Grotesk / Inter / IBM Plex Mono) are referenced by name
   with system-font fallbacks rather than loaded via `next/font/google`,
   since that requires fetching from Google's font CDN at build time,
   which this sandbox's network policy blocks. Add `next/font/google` (or
   self-hosted font files) in a normal dev environment to get the exact
   intended type.
