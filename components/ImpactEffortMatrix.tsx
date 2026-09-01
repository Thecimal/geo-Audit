import type { DerivedIssue } from "@/lib/recommendations";

const W = 480;
const H = 320;
const PAD = 36;

function toneColor(severity: DerivedIssue["severity"]) {
  if (severity === "CRITICAL" || severity === "HIGH") return "#F2545B";
  if (severity === "MEDIUM") return "#F5A524";
  return "#5EEAD4";
}

// Small deterministic jitter so same-coordinate issues don't fully overlap.
function jitter(seed: string, range: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 997;
  return ((h / 997) - 0.5) * range;
}

export function ImpactEffortMatrix({ issues }: { issues: DerivedIssue[] }) {
  const plotW = W - PAD * 2;
  const plotH = H - PAD * 2;

  const xFor = (effort: number, seed: string) => PAD + ((effort - 0.5) / 5) * plotW + jitter(seed + "x", 14);
  const yFor = (impact: number, seed: string) => H - PAD - ((impact - 0.5) / 5) * plotH + jitter(seed + "y", 14);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="max-w-xl">
      {/* Quadrant backgrounds */}
      <rect x={PAD} y={PAD} width={plotW / 2} height={plotH / 2} fill="#1E262C" />
      <rect x={PAD + plotW / 2} y={PAD} width={plotW / 2} height={plotH / 2} fill="#171E23" />
      <rect x={PAD} y={PAD + plotH / 2} width={plotW / 2} height={plotH / 2} fill="#171E23" />
      <rect x={PAD + plotW / 2} y={PAD + plotH / 2} width={plotW / 2} height={plotH / 2} fill="#1E262C" />

      {/* Axes */}
      <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#2C363D" />
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#2C363D" />
      <line x1={PAD + plotW / 2} y1={PAD} x2={PAD + plotW / 2} y2={H - PAD} stroke="#2C363D" strokeDasharray="3 3" />
      <line x1={PAD} y1={PAD + plotH / 2} x2={W - PAD} y2={PAD + plotH / 2} stroke="#2C363D" strokeDasharray="3 3" />

      {/* Quadrant labels */}
      <text x={PAD + 8} y={PAD + 16} fontSize="10" fill="#5EEAD4" className="font-data">QUICK WINS</text>
      <text x={W - PAD - 8} y={PAD + 16} fontSize="10" fill="#728088" textAnchor="end" className="font-data">MAJOR PROJECTS</text>
      <text x={PAD + 8} y={H - PAD - 8} fontSize="10" fill="#728088" className="font-data">FILL-INS</text>
      <text x={W - PAD - 8} y={H - PAD - 8} fontSize="10" fill="#728088" textAnchor="end" className="font-data">RECONSIDER</text>

      {/* Axis labels */}
      <text x={W / 2} y={H - 6} fontSize="10" fill="#AEB9BE" textAnchor="middle" className="font-data">EFFORT →</text>
      <text x={12} y={H / 2} fontSize="10" fill="#AEB9BE" textAnchor="middle" className="font-data" transform={`rotate(-90 12 ${H / 2})`}>
        IMPACT →
      </text>

      {/* Points */}
      {issues.map((issue) => (
        <circle
          key={issue.id}
          cx={xFor(issue.effort, issue.id)}
          cy={yFor(issue.impact, issue.id)}
          r={5}
          fill={toneColor(issue.severity)}
          fillOpacity={0.85}
          stroke="#0F1417"
          strokeWidth={1}
        >
          <title>
            {issue.title} — impact {issue.impact}/5, effort {issue.effort}/5
          </title>
        </circle>
      ))}
    </svg>
  );
}
