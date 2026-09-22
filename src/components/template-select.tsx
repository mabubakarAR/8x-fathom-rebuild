"use client";

import { TEMPLATES } from "@/lib/seed/cast";

// Compact template chooser for the places that are not the summary pane —
// the recorder and the import screen, where the picker is one control in a
// row rather than the main event. Native select on purpose: it groups, it
// handles seventeen options without scrolling the page, and it is keyboard
// and screen-reader correct for free.

const GROUP_LABEL: Record<string, string> = {
  core: "General",
  sales: "Sales",
  success: "Customer success",
  team: "Team",
};

export function TemplateSelect({
  value,
  onChange,
  label = "Summary style",
}: {
  value: string;
  onChange: (key: string) => void;
  label?: string;
}) {
  const groups = Object.keys(GROUP_LABEL)
    .map((g) => ({ g, items: TEMPLATES.filter((t) => (t.group ?? "core") === g) }))
    .filter((x) => x.items.length);

  return (
    <label className="flex items-center gap-2 text-[11.5px]" style={{ color: "var(--ink-faint)" }}>
      {label}
      {/* appearance-none, because the native control renders with the OS
          light chrome on a dark page and looks like a bug. */}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          // A <select> sizes itself to its widest <option>, and one of the
          // seventeen templates has a long label — which is why this control
          // was rendering four times the width of the word inside it. The
          // popup is laid out separately, so pinning the closed width costs
          // nothing: every label still shows in full when it is open.
          className="w-[142px] appearance-none truncate rounded-[var(--radius-sm)] py-[7px] pr-7 pl-2.5 text-[12.5px] font-medium outline-none"
          style={{
            background: "var(--surface-2)",
            color: "var(--ink)",
            border: "1px solid var(--line)",
            colorScheme: "dark light",
          }}
        >
          {groups.map(({ g, items }) => (
            <optgroup key={g} label={GROUP_LABEL[g]}>
              {items.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <span
          className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2"
          style={{ color: "var(--ink-faint)" }}
          aria-hidden
        >
          <svg width="9" height="6" viewBox="0 0 9 6" fill="none">
            <path d="M1 1l3.5 3.5L8 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </span>
      </div>
    </label>
  );
}
