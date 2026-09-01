export function EvidenceChip({ children }: { children: string }) {
  return (
    <span className="inline-block rounded border border-ink-line bg-ink-surface px-2 py-1 font-data text-[11px] leading-snug text-text-mid">
      {children}
    </span>
  );
}
