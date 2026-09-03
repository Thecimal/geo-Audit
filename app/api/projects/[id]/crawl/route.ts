import { NextResponse } from "next/server";
import { getProject } from "@/lib/data/getProject";

// POST /api/projects/:id/crawl — see architecture.md section 5.
//
// Deliberately returns 501, not a fake 202 + polling loop that never
// finishes: services/crawler is a real, tested Python package
// (see services/crawler/), but this sandbox's network is restricted to
// package registries and can't reach arbitrary sites, and there's no job
// queue wired up to run it out-of-process from a Node route handler
// either. Wiring this up for real means: (1) a queue (e.g. a
// `CrawlRun` row + worker process invoking services/crawler/pipeline.py),
// and (2) this route enqueuing a run and returning its id instead of
// running the crawl inline. Until then this route exists so the API
// surface matches the documented shape and callers get a clear signal
// instead of a silent 404.
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const project = await getProject();

  if (params.id !== project.id) {
    return NextResponse.json({ error: `No project with id "${params.id}"` }, { status: 404 });
  }

  return NextResponse.json(
    {
      error: "Crawling is not wired up in this build.",
      detail:
        "services/crawler is real and tested (see services/crawler/tests) but isn't invoked by this route yet — see architecture.md section 9.",
    },
    { status: 501 }
  );
}
