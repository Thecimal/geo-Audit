"use client";

import { useEffect, useState } from "react";

// A 210° instrument sweep, -105° (min) to +105° (max), matching the
// oscilloscope-dial reference in the design brief. Score bands mirror
// the "clear signal / partial signal / noise" read used across the app.
const SWEEP = 210;
const START_ANGLE = -105;

function angleForScore(score: number) {
  return START_ANGLE + (Math.max(0, Math.min(100, score)) / 100) * SWEEP;
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function bandColor(score: number) {
  if (score >= 70) return "#5EEAD4";
  if (score >= 40) return "#F5A524";
  return "#F2545B";
}

const SIZES = {
  lg: { box: 220, r: 88, stroke: 10, tickR: 98, font: 40, labelFont: 12 },
  md: { box: 140, r: 56, stroke: 8, tickR: 63, font: 26, labelFont: 10 },
  sm: { box: 84, r: 32, stroke: 6, tickR: 37, font: 16, labelFont: 0 },
} as const;

export function ScoreGauge({
  score,
  size = "lg",
  label,
}: {
  score: number;
  size?: keyof typeof SIZES;
  label?: string;
}) {
  const cfg = SIZES[size];
  const cx = cfg.box / 2;
  const cy = cfg.box / 2 + cfg.stroke / 2;
  const color = bandColor(score);

  const [animatedScore, setAnimatedScore] = useState(0);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimatedScore(score));
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const needleAngle = angleForScore(animatedScore);
  const ticks = Array.from({ length: 11 }, (_, i) => i * 10);

  return (
    <div className="flex flex-col items-center" style={{ width: cfg.box }}>
      <svg width={cfg.box} height={cfg.box / 2 + cfg.stroke * 2 + 4} viewBox={`0 0 ${cfg.box} ${cfg.box / 2 + cfg.stroke * 2 + 4}`}>
        {/* Track */}
        <path
          d={arcPath(cx, cy, cfg.r, START_ANGLE, START_ANGLE + SWEEP)}
          fill="none"
          stroke="#242E35"
          strokeWidth={cfg.stroke}
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d={arcPath(cx, cy, cfg.r, START_ANGLE, needleAngle)}
          fill="none"
          stroke={color}
          strokeWidth={cfg.stroke}
          strokeLinecap="round"
          style={{ transition: "d 0.8s cubic-bezier(0.16,1,0.3,1)" }}
        />
        {/* Ticks */}
        {size !== "sm" &&
          ticks.map((t) => {
            const a = angleForScore(t);
            const p1 = polar(cx, cy, cfg.tickR, a);
            const p2 = polar(cx, cy, cfg.tickR - 6, a);
            return (
              <line
                key={t}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="#728088"
                strokeWidth={1}
              />
            );
          })}
        {/* Readout */}
        <text
          x={cx}
          y={cy - cfg.r * 0.05}
          textAnchor="middle"
          className="font-data"
          fontSize={cfg.font}
          fill="#E8EDEF"
          fontWeight={600}
        >
          {Math.round(animatedScore)}
        </text>
        {cfg.labelFont > 0 && (
          <text x={cx} y={cy + cfg.font * 0.42} textAnchor="middle" className="font-data" fontSize={cfg.labelFont} fill="#728088">
            / 100
          </text>
        )}
      </svg>
      {label && <p className="mt-1 text-center text-xs text-text-mid">{label}</p>}
    </div>
  );
}
