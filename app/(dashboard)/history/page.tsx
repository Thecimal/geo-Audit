import { getProject } from "@/lib/data/getProject";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { HistoryChart } from "@/components/HistoryChart";

function formatShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function HistoryPage() {
  const project = await getProject();
  const { history, score } = project;

  const points = [
    ...history.map((h) => ({ label: formatShort(h.createdAt), score: h.overallScore })),
    { label: formatShort(project.crawledAt), score: score.overallScore },
  ];

  const oldest = history[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text-high">History</h1>
        <p className="mt-1 text-sm text-text-mid">
          Every audit is stored immutably — nothing here is recomputed after the fact, so this trend reflects real crawl runs.
        </p>
      </div>

      <Card>
        <CardHeader title="Overall score trend" sub={`${points.length} audit runs`} />
        <CardBody>
          <HistoryChart points={points} />
        </CardBody>
      </Card>

      {oldest && (
        <Card>
          <CardHeader title="Before / after" sub={`${formatShort(oldest.createdAt)} → ${formatShort(project.crawledAt)}`} />
          <CardBody className="space-y-2">
            {score.kpiScores.map((kpi) => {
              const before = oldest.kpiScores.find((k) => k.key === kpi.key)?.score ?? 0;
              const delta = kpi.score - before;
              return (
                <div key={kpi.key} className="flex items-center justify-between rounded-md border border-ink-line bg-ink-surface px-3 py-2.5">
                  <p className="text-sm text-text-high">{kpi.label}</p>
                  <div className="flex items-center gap-2 font-data text-xs">
                    <span className="text-text-low">{before}</span>
                    <span className="text-text-low">→</span>
                    <span className="text-text-high">{kpi.score}</span>
                    <Badge tone={delta > 0 ? "cyan" : delta < 0 ? "coral" : "neutral"}>
                      {delta > 0 ? "+" : ""}
                      {delta}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Crawl runs" />
        <CardBody className="space-y-1.5">
          {[...history, { id: "current", createdAt: project.crawledAt, overallScore: score.overallScore, kpiScores: [] }].map((h) => (
            <div key={h.id} className="flex items-center justify-between rounded-md border border-ink-line bg-ink-surface px-3 py-2 text-sm">
              <span className="text-text-mid">{formatShort(h.createdAt)}</span>
              <span className="font-data text-text-high">{h.overallScore}/100</span>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
