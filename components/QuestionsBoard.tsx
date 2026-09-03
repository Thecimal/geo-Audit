"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { ConfidenceMeter } from "./ui/ConfidenceMeter";
import { Badge } from "./ui/Badge";
import type { QuestionCoverage } from "@/lib/questions";

function coverageTone(score: number) {
  if (score >= 0.6) return "cyan" as const;
  if (score > 0) return "amber" as const;
  return "coral" as const;
}

export function QuestionsBoard({ initial, projectId }: { initial: QuestionCoverage[]; projectId: string }) {
  const [questions, setQuestions] = useState(initial);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addQuestion = async () => {
    const text = draft.trim();
    if (!text || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      // Scoring happens server-side (POST /api/projects/:id/questions) so
      // the embedding API key never has to reach the browser.
      const res = await fetch(`/api/projects/${projectId}/questions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const { question } = (await res.json()) as { question: QuestionCoverage };
      setQuestions((qs) => [...qs, question]);
      setDraft("");
    } catch {
      setError("Couldn't score that question — try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addQuestion()}
          placeholder="Add a question a customer might ask an AI assistant…"
          className="flex-1 rounded-md border border-ink-line bg-ink-surface px-3 py-2 text-sm text-text-high placeholder:text-text-low"
        />
        <button
          onClick={addQuestion}
          disabled={submitting}
          className="flex items-center gap-1.5 rounded-md border border-signal-cyan/40 bg-signal-cyan/10 px-3 py-2 text-sm text-signal-cyan disabled:opacity-50"
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
        </button>
      </div>
      {error && <p className="text-xs text-signal-coral">{error}</p>}

      <div className="space-y-2">
        {questions.map((q, i) => (
          <div key={i} className="rounded-md border border-ink-line bg-ink-panel px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-text-high">{q.text}</p>
              <div className="flex shrink-0 items-center gap-2.5">
                <ConfidenceMeter ratio={q.coverageScore} />
                <Badge tone={coverageTone(q.coverageScore)}>{Math.round(q.coverageScore * 100)}%</Badge>
              </div>
            </div>
            {q.gapSummary && <p className="mt-1.5 text-xs text-text-low">{q.gapSummary}</p>}
            {q.answeredBy.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {q.answeredBy.map((url) => (
                  <span key={url} className="rounded border border-ink-line bg-ink-surface px-2 py-0.5 font-data text-[10px] text-text-mid">
                    {url.replace(/^https?:\/\//, "")}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
