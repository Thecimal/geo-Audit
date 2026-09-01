import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ScoreGauge } from "./ui/ScoreGauge";
import type { KpiScore } from "@/lib/scoring/types";

export function KpiCard({ kpi, delta, href }: { kpi: KpiScore; delta?: number; href?: string }) {
  const content = (
    <div className="flex items-center gap-4 rounded-lg border border-ink-line bg-ink-panel px-4 py-3 shadow-panel transition-colors hover:border-signal-cyan/40">
      <ScoreGauge score={kpi.score} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-display text-sm font-medium text-text-high">{kpi.label}</p>
          <span className="shrink-0 font-data text-[11px] text-text-low">wt {kpi.weight}</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          {delta !== undefined && delta !== 0 && (
            <span className={`flex items-center gap-0.5 text-[11px] font-data ${delta > 0 ? "text-signal-cyan" : "text-signal-coral"}`}>
              {delta > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {delta > 0 ? "+" : ""}
              {delta}
            </span>
          )}
          {delta === 0 && (
            <span className="flex items-center gap-0.5 text-[11px] font-data text-text-low">
              <Minus size={12} /> 0
            </span>
          )}
          <span className="text-[11px] text-text-low">
            {kpi.components.filter((c) => !c.insufficientEvidence && c.points >= c.maxPoints).length}/
            {kpi.components.filter((c) => !c.insufficientEvidence).length} checks passing
          </span>
        </div>
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
