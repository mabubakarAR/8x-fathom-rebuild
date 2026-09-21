"use client";

import { useState } from "react";
import type { Template } from "@/lib/types";
import { Icon, type IconName } from "./ui";

// The template picker.
//
// Fathom shows this as a grid of cards — icon, name, one line of what it is
// for — and the reason that matters is not aesthetic. A rep who qualifies on
// MEDDPICC needs to *find* MEDDPICC, and a row of identical pills reading
// "General Sales Discovery…" makes sixteen options unreadable. Cards with a
// sentence each make the list scannable at sixteen, which is what lets the
// product have sixteen.
//
// Grouped, collapsed to the likely ones by default, because a picker that
// opens with sixteen choices is its own kind of unusable.

const GROUP_LABEL: Record<string, string> = {
  core: "General",
  sales: "Sales",
  success: "Customer success",
  team: "Team",
};

const GROUP_ICON: Record<string, IconName> = {
  core: "list",
  sales: "chart",
  success: "user",
  team: "chapter",
};

export function TemplatePicker({
  templates,
  available,
  activeKey,
  suggested,
  onPick,
  onGenerate,
  generating,
}: {
  templates: Template[];
  /** Keys that actually have a generated summary behind them. */
  available: string[];
  activeKey: string;
  /** Best-fit keys for this meeting kind, shown before the rest. */
  suggested: string[];
  onPick: (key: string) => void;
  /** Present on meetings that came through the model: picking a template
   *  that has not been generated yet runs it for real instead of sitting
   *  there greyed out. */
  onGenerate?: (key: string) => void;
  generating?: string | null;
}) {
  const [all, setAll] = useState(false);

  const top = new Set([...suggested.slice(0, 4), activeKey]);
  const shown = all ? templates : templates.filter((t) => top.has(t.key));

  const groups = Object.keys(GROUP_LABEL)
    .map((g) => ({ g, items: shown.filter((t) => (t.group ?? "core") === g) }))
    .filter((x) => x.items.length);

  return (
    <div>
      {groups.map(({ g, items }) => (
        <div key={g} className="mb-2.5">
          {all && (
            <div
              className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-semibold tracking-[0.07em] uppercase"
              style={{ color: "var(--ink-faint)" }}
            >
              <Icon name={GROUP_ICON[g]} size={11} /> {GROUP_LABEL[g]}
            </div>
          )}
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {items.map((t) => {
              const has = available.includes(t.key);
              const on = t.key === activeKey;
              const busy = generating === t.key;
              const canMake = !has && Boolean(onGenerate);
              return (
                <button
                  key={t.key}
                  onClick={() => (has ? onPick(t.key) : onGenerate?.(t.key))}
                  disabled={(!has && !canMake) || Boolean(generating)}
                  aria-pressed={on}
                  title={
                    has
                      ? t.blurb
                      : canMake
                        ? `${t.blurb} — click to generate this summary`
                        : `${t.blurb} — not generated for this meeting`
                  }
                  className="rounded-[var(--radius-sm)] p-2 text-left transition-colors disabled:cursor-not-allowed"
                  style={{
                    background: on ? "var(--accent-soft)" : "var(--surface-2)",
                    border: `1px solid ${on ? "var(--accent-line)" : "var(--line)"}`,
                    opacity: has || canMake ? 1 : 0.45,
                  }}
                >
                  <div
                    className="flex items-center gap-1.5 text-[12.5px] font-semibold"
                    style={{ color: on ? "var(--accent-ink)" : "var(--ink)" }}
                  >
                    {t.label}
                    {canMake && !busy && (
                      <span style={{ color: "var(--ink-faint)" }} title="Not generated yet">
                        <Icon name="sparkle" size={11} />
                      </span>
                    )}
                    {busy && (
                      <span className="text-[10.5px] font-medium" style={{ color: "var(--accent)" }}>
                        writing…
                      </span>
                    )}
                  </div>
                  <div
                    className="mt-0.5 line-clamp-2 text-[11px] leading-[1.4]"
                    style={{ color: "var(--ink-faint)" }}
                  >
                    {t.blurb}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <button
        onClick={() => setAll((v) => !v)}
        className="flex items-center gap-1 text-[11.5px] font-medium"
        style={{ color: "var(--accent-ink)" }}
      >
        <span
          className="transition-transform"
          style={{ transform: all ? "rotate(90deg)" : "none" }}
        >
          <Icon name="chevron" size={11} />
        </span>
        {all ? "Show fewer" : `All ${templates.length} templates`}
      </button>
    </div>
  );
}
