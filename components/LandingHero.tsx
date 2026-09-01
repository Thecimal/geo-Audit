"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2 } from "lucide-react";

const STAGES = [
  "Crawling site",
  "Extracting content",
  "Building knowledge graph",
  "Running GEO analysis",
  "Scoring & generating recommendations",
];

export function LandingHero() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [running, setRunning] = useState(false);
  const [stageIndex, setStageIndex] = useState(-1);

  const runAudit = () => {
    if (running) return;
    setRunning(true);
    setStageIndex(0);

    STAGES.forEach((_, i) => {
      setTimeout(() => setStageIndex(i), (i + 1) * 550);
    });
    setTimeout(() => router.push("/overview"), (STAGES.length + 1) * 550);
  };

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://yourbusiness.com"
          disabled={running}
          className="flex-1 rounded-md border border-ink-line bg-ink-surface px-4 py-3 text-sm text-text-high placeholder:text-text-low disabled:opacity-60"
        />
        <button
          onClick={runAudit}
          disabled={running}
          className="flex items-center justify-center gap-2 rounded-md bg-signal-cyan px-5 py-3 text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {running ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
          {running ? "Analyzing…" : "Run free audit"}
        </button>
      </div>
      <p className="mt-2 text-xs text-text-low">
        This environment can't crawl arbitrary live URLs — running the audit shows results for the bundled demo project instead. See{" "}
        <a href="/settings" className="text-signal-cyan hover:underline">
          Settings
        </a>{" "}
        for details.
      </p>

      {running && (
        <div className="mt-6 space-y-2 rounded-lg border border-ink-line bg-ink-panel p-4">
          {STAGES.map((stage, i) => {
            const done = i < stageIndex;
            const active = i === stageIndex;
            return (
              <div key={stage} className="flex items-center gap-2.5 text-sm">
                {done ? (
                  <Check size={15} className="text-signal-cyan" />
                ) : active ? (
                  <Loader2 size={15} className="animate-spin text-signal-cyan" />
                ) : (
                  <span className="h-[15px] w-[15px] rounded-full border border-ink-line" />
                )}
                <span className={done || active ? "text-text-high" : "text-text-low"}>{stage}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
