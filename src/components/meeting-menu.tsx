"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./ui";

/**
 * The "···" on a meeting. Share, copy link, download the audio, delete.
 *
 * Delete is two clicks inside the same menu rather than a modal: the second
 * click is the confirmation, it is red, and it says what it does. A modal for
 * this would be ceremony; a single click would be a trap. Deleting goes
 * through DELETE /api/calls/<id>, which removes the transcript, speakers,
 * summary, actions, highlights and audio in one cascade — there is no trash.
 */
export function MeetingMenu({
  id,
  title,
  mediaUrl,
  sample,
  onShare,
  afterDelete,
  compact,
}: {
  id: string;
  title: string;
  mediaUrl?: string | null;
  sample?: boolean;
  /** Opens the share dialog, when the host has one. */
  onShare?: () => void;
  /** Where to go once the meeting is gone. Defaults to a refresh in place. */
  afterDelete?: "home" | "refresh";
  /** The small round trigger used on cards. */
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [arming, setArming] = useState(false);
  const [busy, setBusy] = useState<null | "deleting" | "copied">(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
    setArming(false);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${location.origin}/m/${id}`);
      setBusy("copied");
      setTimeout(() => {
        setBusy(null);
        close();
      }, 900);
    } catch {
      close();
    }
  }

  async function remove() {
    setBusy("deleting");
    const res = await fetch(`/api/calls/${id}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) {
      close();
      return;
    }
    close();
    if (afterDelete === "home") router.push("/");
    router.refresh();
  }

  return (
    <div className="relative" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
          setArming(false);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`More for ${title}`}
        title="More"
        className={
          compact
            ? "grid h-8 w-8 place-items-center rounded-full transition-colors"
            : "inline-flex h-[34px] w-[34px] items-center justify-center rounded-[var(--radius-sm)]"
        }
        style={
          compact
            ? { background: "oklch(100% 0 0 / .92)", color: "oklch(12% 0 0)", boxShadow: "0 4px 14px oklch(0% 0 0 / .35)" }
            : { background: "var(--surface)", color: "var(--ink-2)", border: "1px solid var(--line)" }
        }
      >
        <Dots />
      </button>

      {open && (
        <div
          role="menu"
          className="fade-up absolute right-0 z-40 mt-1.5 w-[232px] overflow-hidden rounded-[var(--radius)] p-1 text-left"
          style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-lg)" }}
        >
          {onShare && (
            <Item icon="share" label="Share" hint="A link for someone not on the call" onClick={() => { close(); onShare(); }} />
          )}
          <Item icon="link" label={busy === "copied" ? "Copied" : "Copy link"} hint="/m/… for people in this workspace" onClick={copyLink} />
          {mediaUrl && (
            <a
              role="menuitem"
              href={mediaUrl}
              download={`${slug(title)}.webm`}
              onClick={close}
              className="flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 transition-colors hover:bg-[var(--surface-2)]"
            >
              <span style={{ color: "var(--ink-3)" }}><Icon name="download" size={14} /></span>
              <span className="flex flex-col">
                <span className="text-[13px] font-medium" style={{ color: "var(--ink)" }}>Download audio</span>
                <span className="text-[11.5px]" style={{ color: "var(--ink-faint)" }}>The recording as it was captured</span>
              </span>
            </a>
          )}
          <div className="my-1 border-t" style={{ borderColor: "var(--line)" }} />
          {!arming ? (
            <Item
              icon="close"
              label="Delete meeting"
              hint={sample ? "This is a sample meeting" : "Transcript, notes and audio"}
              danger
              onClick={() => setArming(true)}
            />
          ) : (
            <button
              role="menuitem"
              onClick={remove}
              disabled={busy === "deleting"}
              className="flex w-full flex-col rounded-[var(--radius-sm)] px-2.5 py-2 text-left transition-colors disabled:opacity-60"
              style={{ background: "var(--danger-soft)" }}
            >
              <span className="text-[13px] font-semibold" style={{ color: "var(--danger)" }}>
                {busy === "deleting" ? "Deleting…" : "Yes, delete it"}
              </span>
              <span className="text-[11.5px]" style={{ color: "var(--danger)" }}>There is no undo. Press Esc to keep it.</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Item({ icon, label, hint, onClick, danger }: { icon: "share" | "link" | "close"; label: string; hint: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left transition-colors hover:bg-[var(--surface-2)]"
    >
      <span style={{ color: danger ? "var(--danger)" : "var(--ink-3)" }}><Icon name={icon} size={14} /></span>
      <span className="flex flex-col">
        <span className="text-[13px] font-medium" style={{ color: danger ? "var(--danger)" : "var(--ink)" }}>{label}</span>
        <span className="text-[11.5px]" style={{ color: "var(--ink-faint)" }}>{hint}</span>
      </span>
    </button>
  );
}

function Dots() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <circle cx="3.5" cy="8" r="1.4" fill="currentColor" />
      <circle cx="8" cy="8" r="1.4" fill="currentColor" />
      <circle cx="12.5" cy="8" r="1.4" fill="currentColor" />
    </svg>
  );
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "recording";
}
