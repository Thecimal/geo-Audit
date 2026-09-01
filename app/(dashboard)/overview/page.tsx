import Link from "next/link";
import { AlertTriangle, FileText, Zap } from "lucide-react";
import { getProject } from "@/lib/data/getProject";
import { generateOverviewSummary } from "@/lib/solutions/summary";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import { KpiCard } from "@/components/KpiCard";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge, severityTone } from "@/components/ui/Badge";

export default async function OverviewPage() {
  const project = await getProject();
  const { score, issues, history, data } = project;
  const summary = generateOverviewSummary(project.displayName, score);

  const previous = history[history.length - 1];
  const deltaFor = (key: string) => {
    const prev = previous?.kpiScores.find((k) => k.key === key)?.score;
    const curr = score.kpiScores.find((k) => k.key === key)?.score ?? 0;
    return prev === undefined ? undefined : curr - prev;
  };

  const critical = issues.filter((i) => i.severity === "CRITICAL" || i.severity === "HIGH");
  const topProblems = issues.slice(0, 5);
  const quickWins = [...issues].sort((a, b) => b.impact - a.effort - (a.impact - b.effort)).filter((i) => i.effort <= 2).slice(0, 4);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text-high">GEO Health</h1>
        <p className="mt-1 text-sm text-text-mid">How legible {project.displayName} is to AI answer engines right now.</p>
      </div>

      <Card>
        <CardBody className="flex flex-col items-center gap-6 py-6 sm:flex-row sm:items-start">
          <ScoreGauge score={score.overallScore} size="lg" />
          <div className="flex-1 space-y-4">
            <p className="text-sm leading-relaxed text-text-mid">{summary}</p>
            <div className="grid grid-cols-3 gap-3">
              <StatTile icon={FileText} label="Pages crawled" value={data.pages.length} />
              <StatTile icon={AlertTriangle} label="Open issues" value={issues.length} />
              <StatTile icon={Zap} label="Critical / high" value={critical.length} tone={critical.length > 0 ? "coral" : "cyan"} />
            </div>
          </div>
        </CardBody>
      </Card>

      <div>
        <h2 className="mb-3 font-display text-sm font-medium text-text-high">KPI grid</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {score.kpiScores.map((kpi) => (
            <KpiCard key={kpi.key} kpi={kpi} delta={deltaFor(kpi.key)} href={`/audit?kpi=${kpi.key}`} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Top problems" sub="Highest weighted impact first" />
          <CardBody className="space-y-2">
            {topProblems.map((issue) => (
              <Link
                key={issue.id}
                href="/issues"
                className="flex items-start justify-between gap-3 rounded-md border border-ink-line bg-ink-surface px-3 py-2.5 transition-colors hover:border-signal-cyan/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-text-high">{issue.title}</p>
                  <p className="text-xs text-text-low">{issue.kpiLabel}</p>
                </div>
                <Badge tone={severityTone(issue.severity)}>{issue.severity}</Badge>
              </Link>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Quick wins" sub="Low effort, meaningful impact" />
          <CardBody className="space-y-2">
            {quickWins.length === 0 && <p className="text-sm text-text-low">No low-effort fixes left — nice work.</p>}
            {quickWins.map((issue) => (
              <Link
                key={issue.id}
                href="/actions"
                className="flex items-start justify-between gap-3 rounded-md border border-ink-line bg-ink-surface px-3 py-2.5 transition-colors hover:border-signal-cyan/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-text-high">{issue.title}</p>
                  <p className="text-xs text-text-low">{issue.kpiLabel}</p>
                </div>
                <span className="font-data text-[11px] text-signal-cyan">effort {issue.effort}/5</span>
              </Link>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone = "cyan",
}: {
  icon: typeof FileText;
  label: string;
  value: number;
  tone?: "cyan" | "coral";
}) {
  return (
    <div className="rounded-md border border-ink-line bg-ink-surface px-3 py-2.5">
      <Icon size={14} className={tone === "coral" ? "text-signal-coral" : "text-signal-cyan"} />
      <p className="mt-1.5 font-data text-lg font-semibold text-text-high">{value}</p>
      <p className="text-[11px] text-text-low">{label}</p>
    </div>
  );
}
