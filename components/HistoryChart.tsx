const W = 640;
const H = 220;
const PAD_X = 40;
const PAD_Y = 24;

export function HistoryChart({ points }: { points: { label: string; score: number }[] }) {
  const plotW = W - PAD_X * 2;
  const plotH = H - PAD_Y * 2;

  const xFor = (i: number) => PAD_X + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const yFor = (score: number) => PAD_Y + plotH - (score / 100) * plotH;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(p.score)}`).join(" ");
  const areaPath = `${linePath} L ${xFor(points.length - 1)} ${PAD_Y + plotH} L ${xFor(0)} ${PAD_Y + plotH} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={PAD_X} y1={yFor(v)} x2={W - PAD_X} y2={yFor(v)} stroke="#2C363D" strokeDasharray="2 4" />
          <text x={PAD_X - 8} y={yFor(v) + 3} fontSize="10" fill="#728088" textAnchor="end" className="font-data">
            {v}
          </text>
        </g>
      ))}

      <path d={areaPath} fill="#5EEAD4" fillOpacity={0.08} stroke="none" />
      <path d={linePath} fill="none" stroke="#5EEAD4" strokeWidth={2} />

      {points.map((p, i) => (
        <g key={i}>
          <circle cx={xFor(i)} cy={yFor(p.score)} r={4} fill="#0F1417" stroke="#5EEAD4" strokeWidth={2} />
          <text x={xFor(i)} y={H - 4} fontSize="10" fill="#728088" textAnchor="middle" className="font-data">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
