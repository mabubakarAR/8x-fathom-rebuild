"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useOverlay } from "@/lib/overlay";
import type { CaptureMode, UpcomingMeeting } from "@/lib/google/calendar";
import { Badge, Icon } from "./ui";

// The calendar band at the top of the meetings list — your real Google
// Calendar, the next seven days, read at page load.
//
// The product decision here is that capture is decided BEFORE the meeting
// and the rule is stated next to it. Fathom's reviewers' most pointed
// complaint is the bot turning up where it wasn't wanted; the answer is not a
// better bot, it is showing the decision while there is still time to change
// it. "Join & record" opens the call and the recorder together.

export const CAPTURE_MODES: { key: CaptureMode; label: string; hint: string }[] = [
  { key: "off", label: "Don't record", hint: "Nothing is captured or stored." },
  { key: "transcript", label: "Transcript only", hint: "Text, no audio kept." },
  { key: "audio", label: "Audio", hint: "Audio and transcript." },
  { key: "full", label: "Audio + video", hint: "Everything, clips included." },
];

interface Props {
  upcoming: UpcomingMeeting[];
  /** Null when the calendar could not be read; the string says why. */
  error: string | null;
  connected: boolean;
}

function relative(mins: number): string {
  if (mins < 1) return "now";
  if (mins < 60) return `in ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `in ${h} ${h === 1 ? "hour" : "hours"}`;
  const d = Math.round(h / 24);
  return d === 1 ? "tomorrow" : `in ${d} days`;
}

export function Upcoming({ upcoming, error, connected }: Props) {
  const overlay = useOverlay();
  const [open, setOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const captureOf = (m: UpcomingMeeting): CaptureMode =>
    (overlay.state.captureChoice?.[m.id] as CaptureMode) ?? m.defaultCapture;

  if (!mounted) return null;

  return (
    <section className="mb-7">
      <div className="mb-2 flex flex-wrap items-center gap-2 px-1">
        <h2 className="text-[11px] font-semibold tracking-[0.07em] uppercase" style={{ color: "var(--ink-3)" }}>
          Upcoming
        </h2>
        {connected && !error ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-[2px] text-[11px] font-medium"
            style={{ background: "var(--ok-soft)", color: "var(--ok)" }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--ok)" }} />
            Google Calendar · next 7 days
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-[2px] text-[11px] font-medium"
            style={{ background: "var(--warn-soft)", color: "var(--warn)" }}
            title={error ?? undefined}
          >
            <Icon name="warn" size={11} />
            {error ?? "Calendar not connected"}
          </span>
        )}
        {upcoming.length > 0 && (
          <button onClick={() => setOpen((v) => !v)} className="ml-auto text-[12px] font-medium" style={{ color: "var(--ink-3)" }} aria-expanded={open}>
            {open ? "Hide" : `Show ${upcoming.length}`}
          </button>
        )}
      </div>

      {!error && upcoming.length === 0 && (
        <p className="px-1 text-[12.5px]" style={{ color: "var(--ink-faint)" }}>
          Nothing with a video link in the next seven days. Put a Google Meet on your calendar and it appears here with a recording decision already made.
        </p>
      )}

      {open && upcoming.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {(showAll ? upcoming : upcoming.slice(0, 3)).map((m) => {
            const mode = captureOf(m);
            const modeInfo = CAPTURE_MODES.find((c) => c.key === mode)!;
            const overridden = mode !== m.defaultCapture;
            const guests = m.attendees.filter((a) => a.external);
            const isEditing = editing === m.id;
            const soon = m.startsInMinutes <= 15;

            return (
              <div
                key={m.id}
                className="rounded-[var(--radius-lg)] p-3"
                style={{ background: "var(--surface)", border: `1px solid ${soon && mode !== "off" ? "var(--accent-line)" : "var(--line)"}`, opacity: mode === "off" ? 0.72 : 1 }}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="w-[74px] shrink-0 text-[12.5px] font-semibold tnum" style={{ color: soon ? "var(--accent-ink)" : "var(--ink-2)" }}>
                    {relative(m.startsInMinutes)}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-semibold" style={{ color: "var(--ink)", textDecoration: mode === "off" ? "line-through" : undefined, textDecorationColor: "var(--ink-faint)" }}>
                        {m.title}
                      </span>
                      {m.recurring && <Badge>Recurring</Badge>}
                      {guests.length > 0 && <Badge tone="violet">External</Badge>}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px]" style={{ color: "var(--ink-faint)" }}>
                      <span className="tnum">{m.durationMin} min · {m.platform === "unknown" ? "no link" : m.platform}</span>
                      {m.attendees.length > 0 && (
                        <span className="truncate">
                          {m.attendees.filter((a) => !a.self).slice(0, 3).map((a) => a.name).join(", ")}
                          {m.attendees.length > 4 ? ` +${m.attendees.length - 4}` : ""}
                        </span>
                      )}
                    </span>
                  </span>

                  {m.joinUrl && mode !== "off" && (
                    <Link
                      href={`/record?join=${encodeURIComponent(m.joinUrl)}&title=${encodeURIComponent(m.title)}&mode=${mode}`}
                      className="flex shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-[6px] text-[12.5px] font-semibold"
                      style={{ background: soon ? "var(--danger)" : "var(--surface-2)", color: soon ? "oklch(100% 0 0)" : "var(--ink)", border: "1px solid var(--line)" }}
                    >
                      <span className="block h-2 w-2 rounded-full" style={{ background: "currentColor" }} />
                      Join &amp; record
                    </Link>
                  )}

                  <button
                    onClick={() => setEditing(isEditing ? null : m.id)}
                    aria-expanded={isEditing}
                    className="flex shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-[6px] text-[12.5px] font-medium"
                    style={{ background: mode === "off" ? "var(--surface-2)" : "var(--accent-soft)", color: mode === "off" ? "var(--ink-3)" : "var(--accent-ink)", border: `1px solid ${overridden ? "var(--accent-line)" : "transparent"}` }}
                  >
                    <Icon name={mode === "off" ? "close" : "live"} size={12} />
                    {modeInfo.label}
                    <Icon name="chevronDown" size={11} />
                  </button>
                </div>

                {isEditing && (
                  <div className="fade-up mt-2.5 pt-2.5" style={{ borderTop: "1px solid var(--line)" }}>
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      {CAPTURE_MODES.map((c) => {
                        const picked = c.key === mode;
                        return (
                          <button key={c.key} onClick={() => { overlay.setCaptureChoice(m.id, c.key); setEditing(null); }} title={c.hint}
                            className="rounded-full px-2.5 py-[5px] text-[12px] font-medium"
                            style={{ background: picked ? "var(--accent)" : "var(--surface-2)", color: picked ? "var(--on-accent)" : "var(--ink-2)" }}>
                            {c.label}
                          </button>
                        );
                      })}
                      {overridden && (
                        <button onClick={() => { overlay.setCaptureChoice(m.id, m.defaultCapture); setEditing(null); }} className="ml-1 text-[11.5px] underline" style={{ color: "var(--ink-3)" }}>
                          reset
                        </button>
                      )}
                    </div>
                    <p className="text-[11.5px]" style={{ color: "var(--ink-faint)" }}>
                      {overridden ? (
                        <>You overrode the default. The rule would have chosen <strong>{CAPTURE_MODES.find((c) => c.key === m.defaultCapture)!.label}</strong> — {m.reason.toLowerCase()}.</>
                      ) : (
                        <>Chosen automatically: <strong>{m.reason}</strong>. Override it here and the choice sticks for this meeting only.</>
                      )}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
          {!showAll && upcoming.length > 3 && (
            <button onClick={() => setShowAll(true)} className="self-start px-1 pt-1 text-[12px] font-medium" style={{ color: "var(--accent-ink)" }}>
              {upcoming.length - 3} more scheduled
            </button>
          )}
        </div>
      )}
    </section>
  );
}
