"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Badge, severityTone } from "./ui/Badge";
import { EvidenceChip } from "./ui/EvidenceChip";
import type { DerivedIssue, IssueSeverity } from "@/lib/recommendations";

const SEVERITIES: (IssueSeverity | "ALL")[] = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"];
type SortKey = "impact" | "effort" | "severity";

const SEVERITY_RANK: Record<IssueSeverity, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

export function IssuesExplorer({ issues }: { issues: DerivedIssue[] }) {
  const [severity, setSeverity] = useState<IssueSeverity | "ALL">("ALL");
  const [kpiKey, setKpiKey] = useState<string>("ALL");
  const [sort, setSort] = useState<SortKey>("impact");
  const [expanded, setExpanded] = useState<string | null>(null);

  const kpiOptions = useMemo(() => {
    const seen = new Map<string, string>();
    issues.forEach((i) => seen.set(i.kpiKey, i.kpiLabel));
    return Array.from(seen.entries());
  }, [issues]);

  const filtered = useMemo(() => {
    let list = issues;
    if (severity !== "ALL") list = list.filter((i) => i.severity === severity);
    if (kpiKey !== "ALL") list = list.filter((i) => i.kpiKey === kpiKey);
    list = [...list].sort((a, b) => {
      if (sort === "impact") return b.impact - a.impact;
      if (sort === "effort") return a.effort - b.effort;
      return SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    });
    return list;
  }, [issues, severity, kpiKey, sort]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          {SEVERITIES.map((s) => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className={`rounded-full border px-3 py-1 text-xs font-data transition-colors ${
                severity === s
                  ? "border-signal-cyan/50 bg-signal-cyan/10 text-signal-cyan"
                  : "border-ink-line text-text-mid hover:text-text-high"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <select
            value={kpiKey}
            onChange={(e) => setKpiKey(e.target.value)}
            className="rounded-md border border-ink-line bg-ink-surface px-2.5 py-1.5 text-xs text-text-mid"
          >
            <option value="ALL">All KPIs</option>
            {kpiOptions.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-md border border-ink-line bg-ink-surface px-2.5 py-1.5 text-xs text-text-mid"
          >
            <option value="impact">Sort: Impact</option>
            <option value="effort">Sort: Effort</option>
            <option value="severity">Sort: Severity</option>
          </select>
        </div>
      </div>

      <p className="text-xs text-text-low">
        {filtered.length} of {issues.length} issues
      </p>

      <div className="space-y-2">
        {filtered.map((issue) => {
          const isOpen = expanded === issue.id;
          return (
            <div key={issue.id} className="rounded-md border border-ink-line bg-ink-panel">
              <button
                onClick={() => setExpanded(isOpen ? null : issue.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-high">{issue.title}</p>
                  <p className="text-xs text-text-low">{issue.kpiLabel}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2.5">
                  <span className="font-data text-[11px] text-text-low">impact {issue.impact}/5</span>
                  <span className="font-data text-[11px] text-text-low">effort {issue.effort}/5</span>
                  <Badge tone={severityTone(issue.severity)}>{issue.severity}</Badge>
                  <ChevronDown size={14} className={`text-text-low transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </div>
              </button>
              {isOpen && (
                <div className="space-y-3 border-t border-ink-line px-4 py-3">
                  <p className="text-sm text-text-mid">{issue.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {issue.evidence.map((e, i) => (
                      <EvidenceChip key={i}>{e}</EvidenceChip>
                    ))}
                  </div>
                  <Link
                    href={`/actions?issue=${issue.id}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-signal-cyan/40 bg-signal-cyan/10 px-3 py-1.5 text-xs font-medium text-signal-cyan"
                  >
                    Generate a fix →
                  </Link>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <p className="py-8 text-center text-sm text-text-low">No issues match these filters.</p>}
      </div>
    </div>
  );
}
