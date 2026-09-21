import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 pt-8 pb-5 md:pt-10">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em]" style={{ color: "var(--ink)" }}>
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-[13px]" style={{ color: "var(--ink-3)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
