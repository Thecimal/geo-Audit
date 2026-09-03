# GEO Health

How legible is a business to AI answer engines (ChatGPT, Perplexity, AI
Overviews) — scored across 9 evidence-backed KPIs, with concrete,
ready-to-use fixes generated for every gap.

This build implements the full system described in [`architecture.md`](./architecture.md).
That file is the spec; this README covers how to run it and exactly which
parts are real versus simulated in this sandboxed build.

## Quickstart

```bash
npm install
npm run dev          # http://localhost:3000
```

Other useful commands:

```bash
npm run build         # production build
npm test               # scoring engine unit tests (vitest)
npx tsc --noEmit       # typecheck

cd services/crawler
pip install -r requirements.txt
cd ../..
python -m pytest services/crawler/tests -v   # crawler unit tests (pytest)
```

There's nothing to configure — the demo project ("Example Inc.") is
baked into `lib/data/fixtures/` and loads immediately.

## What's real vs. simulated

Everything **except** the six items below is a real, working implementation —
not a mock, not hardcoded, not a stub that returns a fixed number.

| Layer | Status |
|---|---|
| **Scoring engine** (`lib/scoring/`) | ✅ Real. 9 KPIs × 5-7 components each, computed from actual crawl data with real heuristics (word counts, JSON-LD parsing, robots.txt checks, link-graph analysis, etc.) — nothing is a placeholder number. |
| **Recommendation engine** (`lib/recommendations/`) | ✅ Real. Walks every unscored component and derives severity/impact/effort from the actual scoring gap. |
| **Solution generator** (`lib/solutions/generate.ts`) | ⚠️ Template-based, not a live LLM call — see [§8 of architecture.md](./architecture.md#8-ai-semantic-analyzer--the-llm-seam) for the exact seam to wire up `ANTHROPIC_API_KEY`. Output is still grounded in real crawl data, just not free-generated. |
| **Question coverage** (`lib/questions/`) | ⚠️ Embedding-based semantic match via Voyage AI (`VOYAGE_API_KEY`) when configured — falls back to a keyword-overlap heuristic otherwise, or if the live call fails. See `lib/questions/index.ts`. |
| **Python crawler** (`services/crawler/`) | ✅ Real, fully working, fully tested (54 pytest tests) — `fetch.py`, `robots.py`, `extract.py`, `pipeline.py` all do real work. ❌ Not invoked by the Next.js app: this sandbox's network is restricted to package registries, so it can't fetch arbitrary live URLs. Run it yourself (`python -m pytest services/crawler/tests -v`), or point `fetch.safe_get` at a real site outside this sandbox. |
| **Database** (`prisma/schema.prisma`) | ✅ Schema is complete and models every entity in the spec. ❌ Not connected — `lib/data/getProject.ts` reads fixture JSON instead of querying Postgres. This is the one function a real deployment replaces with a database call; nothing else in the app touches fixtures directly. `npx prisma validate` also can't run in this sandbox (the schema-engine binary is fetched from `binaries.prisma.sh`, which isn't on the allowed network list) — validate it yourself after `npm install` in an unrestricted environment. |
| **Auth / multi-tenancy** | ❌ Not wired up. `User`, `ProjectMember`, `AuditLog` exist in the schema for when it's needed. |
| **API routes** | ❌ Implemented as direct server-component data access (`getProject()`) instead of the `POST /api/projects/...` routes documented in architecture.md §5, since there's one demo project and no auth session to scope requests to. The route table in the spec is what `getProject.ts` becomes once a database and auth exist. |
| **Fonts** | Space Grotesk / Inter / IBM Plex Mono are loaded via a `<link>` tag to Google Fonts (works fine in a real browser) rather than `next/font/google`, which needs network access at *build* time — blocked in this sandbox. Tailwind config carries system-font fallbacks either way. |

**The demo data** (`lib/data/fixtures/example-inc.*.json`) is a hand-authored,
realistic crawl of a fictional field-service-scheduling SaaS company,
deliberately built with a mix of strengths and real gaps (no FAQ content,
no `llms.txt`, missing Product/Service schema, a broken link, an orphan
page, a duplicate-title pair, thin author attribution) so every page in
the app has genuine, varied material to show — nothing was reverse-engineered
from a score to look good. Recomputing the score from this fixture data
currently lands around **71/100** overall.

Note: the fixture JSON was hand-written directly against
`lib/scoring/types.ts`'s shape, independent of the Python crawler — it's
*not* the output of an actual `pipeline.crawl()` run. The two are
structurally compatible (same field names, same shapes) but the specific
broken-link/orphan/duplicate scenarios in the fixture were authored by
hand for narrative variety, not produced by crawling a real "Example Inc."
site with the Python pipeline.

## Testing

```bash
npm test                                    # 8 tests — scoring engine
python -m pytest services/crawler/tests -v  # 54 tests — crawler
```

The scoring suite (`lib/scoring/__tests__/scoring.test.ts`) checks:
- `KPI_WEIGHTS` sums to exactly 100
- determinism (identical input → identical output, input never mutated)
- monotonicity (a strictly-better site never scores lower than a
  strictly-worse one, overall and per-KPI)
- every score and component stays within `[0, 100]` / `[0, maxPoints]`

The crawler suite covers `fetch.py`'s SSRF guard (mocked DNS, no real
network calls), `robots.py`'s robots.txt/sitemap parsing, `extract.py`'s
HTML extraction, and `pipeline.py`'s full BFS traversal against an
in-memory fake site — including broken-link, orphan-page, and
duplicate-title detection.

## Project structure

```
app/                    Next.js App Router — see architecture.md §6 for the route list
components/             UI primitives + feature components — see architecture.md §7
lib/scoring/            deterministic KPI engine — see architecture.md §3
lib/recommendations/    score gaps → evidence-backed Issue[]
lib/solutions/          the LLM seam — see architecture.md §8
lib/questions/          AI-search question coverage heuristic
lib/data/               getProject() — the fixture/DB seam
prisma/schema.prisma    full data model — see architecture.md §2
services/crawler/       standalone Python crawler — see architecture.md §4
architecture.md          the original spec this build implements
```
