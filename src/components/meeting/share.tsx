"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { clock } from "@/lib/format";
import { encodeShare, type ShareScope } from "@/lib/sharelink";
import type { Meeting } from "@/lib/types";
import { Icon } from "../ui";

const SCOPES: { key: ShareScope; label: string; hint: string }[] = [
  { key: "public", label: "Anyone with the link", hint: "No sign-in. Opens for anybody you send it to." },
  { key: "domain", label: "Anyone at lumenlabs.io", hint: "Same email domain as you." },
  { key: "invited", label: "Only people you add", hint: "Named recipients only." },
];

export function ShareDialog({
  meeting,
  range,
  onClose,
}: {
  meeting: Meeting;
  range: { startMs: number; endMs: number; title: string } | null;
  onClose: () => void;
}) {
  const [scope, setScope] = useState<ShareScope>("public");
  const [copied, setCopied] = useState(false);
  const [emails, setEmails] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);

  // Focus trap lite: focus the dialog, close on Escape, restore on unmount.
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus();
    };
  }, [onClose]);

  const url = useMemo(() => {
    const token = encodeShare({
      m: meeting.id,
      sc: scope,
      ...(range ? { s: Math.round(range.startMs), e: Math.round(range.endMs), t: range.title } : {}),
      by: "Abubakar Muhammad",
    });
    return `${origin}/s/${token}`;
  }, [meeting.id, scope, range, origin]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked; the input is selectable as a fallback */
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      style={{ background: "oklch(0% 0 0 / .45)" }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={range ? "Share clip" : "Share recording"}
        onClick={(e) => e.stopPropagation()}
        className="fade-up w-full max-w-[480px] rounded-[var(--radius-lg)] p-4 outline-none"
        style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-lg)" }}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold" style={{ color: "var(--ink)" }}>
              {range ? "Share this clip" : "Share recording"}
            </h2>
            <p className="mt-0.5 truncate text-[12.5px]" style={{ color: "var(--ink-3)" }}>
              {range ? (
                <>
                  <span className="tnum">
                    {clock(range.startMs)}–{clock(range.endMs)}
                  </span>{" "}
                  · {range.title}
                </>
              ) : (
                meeting.title
              )}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ color: "var(--ink-3)" }}>
            <Icon name="close" />
          </button>
        </div>

        <fieldset className="mb-3">
          <legend className="sr-only">Who can view</legend>
          <div className="flex flex-col gap-1">
            {SCOPES.map((s) => (
              <label
                key={s.key}
                className="flex cursor-pointer items-start gap-2.5 rounded-[var(--radius-sm)] p-2 transition-colors"
                style={{ background: scope === s.key ? "var(--accent-soft)" : "transparent" }}
              >
                <input
                  type="radio"
                  name="scope"
                  checked={scope === s.key}
                  onChange={() => setScope(s.key)}
                  className="mt-[3px] accent-[var(--accent)]"
                />
                <span>
                  <span className="block text-[13px] font-medium" style={{ color: "var(--ink)" }}>
                    {s.label}
                  </span>
                  <span className="block text-[11.5px]" style={{ color: "var(--ink-3)" }}>
                    {s.hint}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {scope === "invited" && (
          <input
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            placeholder="helen.gao@brightwaterhealth.com, …"
            aria-label="Email addresses"
            className="mb-3 w-full rounded-[var(--radius-sm)] px-2.5 py-2 text-[13px] outline-none"
            style={{ background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--line)" }}
          />
        )}

        <div className="flex items-center gap-2">
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            aria-label="Share link"
            className="min-w-0 flex-1 rounded-[var(--radius-sm)] px-2.5 py-2 text-[12px] outline-none"
            style={{ background: "var(--surface-2)", color: "var(--ink-2)", border: "1px solid var(--line)" }}
          />
          <button
            onClick={copy}
            className="flex shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-2 text-[13px] font-medium"
            style={{ background: copied ? "var(--ok)" : "var(--accent)", color: "var(--on-accent)" }}
          >
            <Icon name={copied ? "check" : "link"} size={14} />
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <p className="mt-2.5 text-[11.5px] leading-relaxed" style={{ color: "var(--ink-faint)" }}>
          {range
            ? "The recipient sees only this range, with the transcript for it — not the rest of the call."
            : "The recipient sees the recording, chapters, transcript and summary. No account needed."}
        </p>
      </div>
    </div>
  );
}
