import { getProject } from "@/lib/data/getProject";
import { scoreQuestionCoverage, defaultQuestionSet } from "@/lib/questions";
import { QuestionsBoard } from "@/components/QuestionsBoard";

export default async function QuestionsPage() {
  const project = await getProject();
  const { businessProfile, pages } = project.data;

  const questionTexts = defaultQuestionSet(businessProfile.companyName.value || "this business", businessProfile.industry.value || "field service");
  const initial = questionTexts.map((q) => scoreQuestionCoverage(q, pages));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text-high">AI search questions</h1>
        <p className="mt-1 text-sm text-text-mid">
          Coverage is a keyword-overlap heuristic against crawled content — a rough proxy for whether an AI assistant could answer each
          question from this site alone.
        </p>
      </div>
      <QuestionsBoard initial={initial} pages={pages} />
    </div>
  );
}
