import { getProject } from "@/lib/data/getProject";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const project = await getProject();

  return (
    <div className="flex h-screen bg-ink text-text-high">
      <Sidebar overallScore={project.score.overallScore} displayName={project.displayName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar url={project.url} crawledAt={project.crawledAt} />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
