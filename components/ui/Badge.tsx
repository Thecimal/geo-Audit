import type { ReactNode } from "react";

type Tone = "cyan" | "amber" | "coral" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  cyan: "bg-signal-cyan/10 text-signal-cyan border-signal-cyan/30",
  amber: "bg-signal-amber/10 text-signal-amber border-signal-amber/30",
  coral: "bg-signal-coral/10 text-signal-coral border-signal-coral/30",
  neutral: "bg-ink-raised text-text-mid border-ink-line",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-data text-[11px] uppercase tracking-wide ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

export function severityTone(severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"): Tone {
  if (severity === "CRITICAL" || severity === "HIGH") return "coral";
  if (severity === "MEDIUM") return "amber";
  return "cyan";
}

export function scoreTone(score: number): Tone {
  if (score >= 70) return "cyan";
  if (score >= 40) return "amber";
  return "coral";
}
