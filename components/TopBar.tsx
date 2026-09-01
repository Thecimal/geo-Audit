import { RefreshCw } from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function TopBar({ url, crawledAt }: { url: string; crawledAt: string }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-ink-line bg-ink-panel/60 px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="font-data text-xs text-text-mid">{url.replace(/^https?:\/\//, "")}</span>
        <span className="h-1 w-1 rounded-full bg-ink-line" />
        <span className="text-xs text-text-low">Last crawl {formatDate(crawledAt)}</span>
      </div>
      <button
        type="button"
        disabled
        title="Live crawling isn't wired up in this build — see README, 'What's real vs. simulated'"
        className="flex cursor-not-allowed items-center gap-1.5 rounded-md border border-ink-line bg-ink-raised px-3 py-1.5 text-xs text-text-low opacity-60"
      >
        <RefreshCw size={13} />
        Re-crawl
      </button>
    </header>
  );
}
