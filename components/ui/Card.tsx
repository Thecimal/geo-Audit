import type { HTMLAttributes, ReactNode } from "react";

export function Card({
  children,
  className = "",
  ...rest
}: { children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-lg border border-ink-line bg-ink-panel shadow-panel ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, action, sub }: { title: ReactNode; action?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ink-line px-5 py-4">
      <div>
        <h3 className="font-display text-sm font-medium text-text-high">{title}</h3>
        {sub ? <p className="mt-0.5 text-xs text-text-low">{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}
