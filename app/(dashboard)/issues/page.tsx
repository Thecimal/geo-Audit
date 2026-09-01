import { getProject } from "@/lib/data/getProject";
import { IssuesExplorer } from "@/components/IssuesExplorer";

export default async function IssuesPage() {
  const project = await getProject();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text-high">Issues</h1>
        <p className="mt-1 text-sm text-text-mid">
          Every scoring gap, ranked and evidence-backed. Filter by severity or KPI, then generate a fix.
        </p>
      </div>
      <IssuesExplorer issues={project.issues} />
    </div>
  );
}
