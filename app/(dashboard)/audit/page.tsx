import { getProject } from "@/lib/data/getProject";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import { Badge, scoreTone } from "@/components/ui/Badge";
import { EvidenceChip } from "@/components/ui/EvidenceChip";

export default async function AuditPage({ searchParams }: { searchParams: { kpi?: string } }) {
  const project = await getProject();
  const highlighted = searchParams.kpi;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text-high">Full audit</h1>
        <p className="mt-1 text-sm text-text-mid">
          Every KPI, broken into named sub-components with the evidence behind each score. Components marked{" "}
          <Badge tone="neutral">insufficient evidence</Badge> are excluded from scoring rather than guessed.
        </p>
      </div>

      {project.score.kpiScores.map((kpi) => (
        <Card key={kpi.key} id={`kpi-${kpi.key}`} className={highlighted === kpi.key ? "border-signal-cyan/60" : undefined}>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                {kpi.label}
                <span className="font-data text-xs font-normal text-text-low">weight {kpi.weight}</span>
              </span>
            }
            sub={`${kpi.components.length} components evaluated`}
            action={<ScoreGauge score={kpi.score} size="sm" />}
          />
          <CardBody className="space-y-3">
            {kpi.components.map((c) => (
              <div key={c.key} className="rounded-md border border-ink-line bg-ink-surface px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-text-high">{c.label}</p>
                  {c.insufficientEvidence ? (
                    <Badge tone="neutral">insufficient evidence</Badge>
                  ) : (
                    <Badge tone={scoreTone(Math.round((c.points / c.maxPoints) * 100))}>
                      {c.points}/{c.maxPoints}
                    </Badge>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.evidence.map((e, i) => (
                    <EvidenceChip key={i}>{e}</EvidenceChip>
                  ))}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
