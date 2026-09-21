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
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[var(--radius-sm)] px-2 py-[5px] text-[12.5px] font-medium outline-none"
        style={{ background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--line)" }}
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
    </label>
  );
}
