"use client";

import { useState } from "react";
import { Check, Copy, Download, RefreshCw } from "lucide-react";
import { Badge, severityTone } from "./ui/Badge";
import type { DerivedIssue } from "@/lib/recommendations";
import type { GeneratedSolution } from "@/lib/solutions/generate";

const EXTENSION_BY_KIND: Record<GeneratedSolution["kind"], string> = {
  JSON_LD: "json",
  COPY: "txt",
  FAQ: "md",
  OUTLINE: "md",
  TECHNICAL_FIX: "md",
};

function SolutionPanel({ issue, solution }: { issue: DerivedIssue; solution: GeneratedSolution }) {
  const [copied, setCopied] = useState(false);
  const [regenCount, setRegenCount] = useState(0);

  const copy = async () => {
    await navigator.clipboard.writeText(solution.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const download = () => {
    const blob = new Blob([solution.body], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${issue.componentKey}.${EXTENSION_BY_KIND[solution.kind]}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-2 border-t border-ink-line px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="font-data text-xs uppercase tracking-wide text-signal-cyan">{solution.kind.replace("_", " ")}</p>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setRegenCount((c) => c + 1)}
            className="flex items-center gap-1 rounded border border-ink-line px-2 py-1 text-[11px] text-text-mid hover:text-text-high"
            title="This build's generator is deterministic — see architecture.md section 8 for the live-LLM seam"
          >
            <RefreshCw size={11} /> Regenerate{regenCount > 0 ? ` (${regenCount})` : ""}
          </button>
          <button onClick={copy} className="flex items-center gap-1 rounded border border-ink-line px-2 py-1 text-[11px] text-text-mid hover:text-text-high">
            {copied ? <Check size={11} className="text-signal-cyan" /> : <Copy size={11} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button onClick={download} className="flex items-center gap-1 rounded border border-ink-line px-2 py-1 text-[11px] text-text-mid hover:text-text-high">
            <Download size={11} /> Download
          </button>
        </div>
      </div>
      <pre className="max-h-64 overflow-auto rounded-md bg-ink-surface p-3 font-data text-[12px] leading-relaxed text-text-mid scrollbar-thin">
        {solution.body}
      </pre>
    </div>
  );
}

export function ActionsBoard({
  issues,
  solutions,
  initiallyOpen,
}: {
  issues: DerivedIssue[];
  solutions: Record<string, GeneratedSolution>;
  initiallyOpen?: string;
}) {
  const [open, setOpen] = useState<string | null>(initiallyOpen ?? null);

  return (
    <div className="space-y-2">
      {issues.map((issue) => {
        const isOpen = open === issue.id;
        const solution = solutions[issue.id];
        return (
          <div key={issue.id} id={`action-${issue.id}`} className="rounded-md border border-ink-line bg-ink-panel">
            <button onClick={() => setOpen(isOpen ? null : issue.id)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-high">{issue.title}</p>
                <p className="text-xs text-text-low">
                  {issue.kpiLabel} · impact {issue.impact}/5 · effort {issue.effort}/5
                </p>
              </div>
              <Badge tone={severityTone(issue.severity)}>{issue.severity}</Badge>
            </button>
            {isOpen && solution && <SolutionPanel issue={issue} solution={solution} />}
          </div>
        );
      })}
    </div>
  );
}
