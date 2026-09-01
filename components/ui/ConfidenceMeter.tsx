function bandColor(ratio: number) {
  if (ratio >= 0.7) return "#5EEAD4";
  if (ratio >= 0.4) return "#F5A524";
  return "#F2545B";
}

/** A 5-bar signal-strength style meter. `ratio` is 0-1. */
export function ConfidenceMeter({ ratio, segments = 5 }: { ratio: number; segments?: number }) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const filled = Math.round(clamped * segments);
  const color = bandColor(clamped);
  return (
    <div className="flex items-end gap-0.5" role="img" aria-label={`${Math.round(clamped * 100)}%`}>
      {Array.from({ length: segments }, (_, i) => (
        <div
          key={i}
          className="w-1.5 rounded-sm transition-colors"
          style={{
            height: 5 + i * 3,
            backgroundColor: i < filled ? color : "#2C363D",
          }}
        />
      ))}
    </div>
  );
}
