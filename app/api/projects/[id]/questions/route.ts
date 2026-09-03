import { NextResponse } from "next/server";
import { getProject } from "@/lib/data/getProject";
import { scoreQuestionCoverage, defaultQuestionSet } from "@/lib/questions";

// GET /api/projects/:id/questions — see architecture.md section 5.
// Scores the default starter question set against the crawled pages.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const project = await getProject();
  if (params.id !== project.id) {
    return NextResponse.json({ error: `No project with id "${params.id}"` }, { status: 404 });
  }

  const { businessProfile, pages } = project.data;
  const questionTexts = defaultQuestionSet(businessProfile.companyName.value || "this business", businessProfile.industry.value || "field service");
  const coverage = await Promise.all(questionTexts.map((q) => scoreQuestionCoverage(q, pages)));

  return NextResponse.json({ questions: coverage });
}

// POST /api/projects/:id/questions — see architecture.md section 5.
// Scores one custom question. This is the seam QuestionsBoard (a client
// component) calls for the "add a question" flow, since scoring can use
// VOYAGE_API_KEY server-side and that key must never reach the browser.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const project = await getProject();
  if (params.id !== project.id) {
    return NextResponse.json({ error: `No project with id "${params.id}"` }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as { text?: string } | null;
  const text = body?.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "Request body must include a non-empty `text` string." }, { status: 400 });
  }

  const coverage = await scoreQuestionCoverage(text, project.data.pages);
  return NextResponse.json({ question: coverage });
}
