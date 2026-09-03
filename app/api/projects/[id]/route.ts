import { NextResponse } from "next/server";
import { getProject } from "@/lib/data/getProject";

// GET /api/projects/:id — see architecture.md section 5.
//
// This build has exactly one project ("example-inc", backed by
// lib/data/fixtures/). getProject() takes no id today because there's
// nothing to disambiguate; this route is the seam architecture.md
// describes — once getProject.ts reads from Postgres instead of
// fixtures, thread `params.id` through to that query and this route's
// shape doesn't change.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const project = await getProject();

  if (params.id !== project.id) {
    return NextResponse.json({ error: `No project with id "${params.id}"` }, { status: 404 });
  }

  return NextResponse.json({
    id: project.id,
    url: project.url,
    displayName: project.displayName,
    crawledAt: project.crawledAt,
    score: project.score,
    issueCount: project.issues.length,
  });
}
