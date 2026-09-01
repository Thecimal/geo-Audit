import type { CrawledPage } from "@/lib/scoring/types";

function statusTone(status: number) {
  if (status >= 200 && status < 300) return "text-signal-cyan";
  if (status >= 400) return "text-signal-coral";
  return "text-signal-amber";
}

export function CrawlTree({ pages, orphanUrls }: { pages: CrawledPage[]; orphanUrls: string[] }) {
  const byDepth = new Map<number, CrawledPage[]>();
  pages.forEach((p) => {
    const list = byDepth.get(p.depth) ?? [];
    list.push(p);
    byDepth.set(p.depth, list);
  });
  const depths = Array.from(byDepth.keys()).sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      {depths.map((depth) => (
        <div key={depth}>
          <p className="mb-1.5 font-data text-[11px] uppercase tracking-wide text-text-low">Depth {depth}</p>
          <div className="space-y-1" style={{ paddingLeft: depth * 20 }}>
            {byDepth.get(depth)!.map((p) => {
              const isOrphan = orphanUrls.includes(p.url);
              return (
                <div
                  key={p.url}
                  className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm ${
                    isOrphan ? "border-signal-coral/30 bg-signal-coral/5" : "border-ink-line bg-ink-surface"
                  }`}
                >
                  <span className="truncate font-data text-xs text-text-mid">{p.url.replace(/^https?:\/\//, "")}</span>
                  <div className="flex shrink-0 items-center gap-3">
                    {isOrphan && <span className="font-data text-[10px] text-signal-coral">orphan</span>}
                    <span className="text-[11px] text-text-low">{p.wordCount}w</span>
                    <span className={`font-data text-[11px] ${statusTone(p.statusCode)}`}>{p.statusCode}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
