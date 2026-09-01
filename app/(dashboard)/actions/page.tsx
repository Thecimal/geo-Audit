import { getProject } from "@/lib/data/getProject";
import { generateSolution } from "@/lib/solutions/generate";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ImpactEffortMatrix } from "@/components/ImpactEffortMatrix";
import { ActionsBoard } from "@/components/ActionsBoard";

export default async function ActionsPage({ searchParams }: { searchParams: { issue?: string } }) {
  const project = await getProject();
  const solutions = Object.fromEntries(project.issues.map((issue) => [issue.id, generateSolution(issue, project.data)]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text-high">Actions</h1>
        <p className="mt-1 text-sm text-text-mid">Prioritize by impact and effort, then generate a ready-to-use fix for each issue.</p>
      </div>

      <Card>
        <CardHeader title="Impact × Effort" sub="Quick wins (top-left) first" />
        <CardBody className="flex justify-center">
          <ImpactEffortMatrix issues={project.issues} />
        </CardBody>
      </Card>

      <div>
        <h2 className="mb-3 font-display text-sm font-medium text-text-high">Generate a fix</h2>
        <ActionsBoard issues={project.issues} solutions={solutions} initiallyOpen={searchParams.issue} />
      </div>
    </div>
  );
}
