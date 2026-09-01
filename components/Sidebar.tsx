"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gauge,
  ClipboardList,
  AlertTriangle,
  ListChecks,
  Network,
  MessageCircleQuestion,
  Route as RouteIcon,
  Braces,
  History,
  Settings,
} from "lucide-react";
import { ScoreGauge } from "./ui/ScoreGauge";

const NAV = [
  { href: "/overview", label: "Overview", icon: Gauge },
  { href: "/audit", label: "Audit", icon: ClipboardList },
  { href: "/issues", label: "Issues", icon: AlertTriangle },
  { href: "/actions", label: "Actions", icon: ListChecks },
  { href: "/knowledge", label: "Knowledge", icon: Network },
  { href: "/questions", label: "Questions", icon: MessageCircleQuestion },
  { href: "/technical", label: "Technical", icon: RouteIcon },
  { href: "/schema", label: "Schema", icon: Braces },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ overallScore, displayName }: { overallScore: number; displayName: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-ink-line bg-ink-panel">
      <div className="flex items-center gap-2 border-b border-ink-line px-5 py-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-signal-cyan/10 text-signal-cyan">
          <Gauge size={16} strokeWidth={2.5} />
        </div>
        <span className="font-display text-sm font-semibold tracking-tight text-text-high">GEO Health</span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4 scrollbar-thin">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-md border-l-2 px-3 py-2 text-sm transition-colors ${
                active
                  ? "border-signal-cyan bg-ink-raised text-text-high"
                  : "border-transparent text-text-mid hover:bg-ink-raised/60 hover:text-text-high"
              }`}
            >
              <Icon size={16} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-2 border-t border-ink-line px-4 py-5">
        <ScoreGauge score={overallScore} size="sm" />
        <p className="text-center text-[11px] leading-tight text-text-low">
          {displayName}
          <br />
          GEO Health Score
        </p>
      </div>
    </aside>
  );
}
