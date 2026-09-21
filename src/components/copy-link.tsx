"use client";

import { useState } from "react";
import { Icon } from "./ui";

export function CopyLink({ path, label = "Copy link" }: { path: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(`${window.location.origin}${path}`);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* clipboard blocked — the Open link is the fallback */
        }
      }}
      aria-label={label}
      className="flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-[4px] text-[11.5px] font-medium"
      style={{
        background: copied ? "var(--ok-soft)" : "var(--surface-2)",
        color: copied ? "var(--ok)" : "var(--ink-2)",
      }}
    >
      <Icon name={copied ? "check" : "link"} size={12} />
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
