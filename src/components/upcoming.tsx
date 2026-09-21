"use client";

import { useEffect, useState } from "react";
import { useOverlay } from "@/lib/overlay";
import { CAPTURE_MODES, type CaptureMode, type UpcomingMeeting } from "@/lib/seed/upcoming";
import type { Person } from "@/lib/types";
import { Avatar, Badge, Icon } from "./ui";

// The calendar band at the top of the meetings list.
//
// Deliberately not a sixth nav item. The rebuild's own seed data contains a
// meeting in which the team decides to collapse nine top-level nav items to
// five because customers cannot find anything; adding a nav item for six rows
// would be a poor look. It lives where you already are.

interface Props {
  upcoming: UpcomingMeeting[];
  people: Person[];
}

function relative(mins: number): string {
  if (mins < 1) return "now";
  if (mins < 60) return `in ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `in ${h} ${h === 1 ? "hour" : "hours"}`;
  const d = Math.round(h / 24);
  return d === 1 ? "tomorrow" : `in ${d} days`;
}

export function Upcoming({ upcoming, people }: Props) {
  const overlay = useOverlay();
  const byId = new Map(people.map((p) => [p.id, p]));
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);

  // Rendered only after hydration: "in 24 min" computed on the server and
  // again on the client will differ, and a hydration mismatch over a cosmetic
  // string is not worth it.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const captureOf = (m: UpcomingMeeting): CaptureMode =>
    (overlay.state.captureChoice?.[m.id] as CaptureMode) ?? m.defaultCapture;

  if (!mounted) return null;

  return (
    <section className="mb-7">
      <div className="mb-2 flex flex-wrap items-center gap-2 px-1">
        <h2
          className="text-[11px] font-semibold tracking-[0.07em] uppercase"
          style={{ color: "var(--ink-3)" }}
        >
          Upcoming
        </h2>

        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-[2px] text-[11px] font-medium"
          style={{ background: "var(--ok-soft)", color: "var(--ok)" }}
          title="Calendar connection is simulated in this rebuild — see /about"
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--ok)" }} />
          Google Calendar connected
        </span>

        <button
          onClick={() => setOpen((v) => !v)}
          className="ml-auto text-[12px] font-medium"
          style={{ color: "var(--ink-3)" }}
          aria-expanded={open}
        >
          {open ? "Hide" : `Show ${upcoming.length}`}
        </button>
      </div>

      {open && (
        <div className="flex flex-col gap-1.5">
          {upcoming.map((m) => {
            const mode = captureOf(m);
            const modeInfo = CAPTURE_MODES.find((c) => c.key === mode)!;
            const overridden = mode !== m.defaultCapture;
            const attendees = m.attendeeIds.map((id) => byId.get(id)).filter(Boolean) as Person[];
            const guests = m.guestEmails ?? [];
            const isEditing = editing === m.id;

            return (
              <div
                key={m.id}
                className="rounded-[var(--radius-lg)] p-3"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  opacity: mode === "off" ? 0.72 : 1,
                }}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span
                    className="w-[74px] shrink-0 text-[12.5px] font-semibold tnum"
                    style={{ color: "var(--ink-2)" }}
                  >
                    {relative(m.startsInMinutes)}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span
                        className="text-[14px] font-semibold"
                        style={{
                          color: "var(--ink)",
                          textDecoration: mode === "off" ? "line-through" : undefined,
                          textDecorationColor: "var(--ink-faint)",
                        }}
                      >
                        {m.title}
                      </span>
                      {m.recurring && <Badge>Recurring</Badge>}
                      {guests.length > 0 && <Badge tone="violet">External</Badge>}
                    </span>
                    <span
                      className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px]"
                      style={{ color: "var(--ink-faint)" }}
                    >
                      <span className="flex items-center gap-1">
                        {attendees.slice(0, 4).map((p) => (
                          <Avatar key={p.id} person={p} size={16} />
                        ))}
                      </span>
                      <span className="tnum">
                        {m.durationMin} min · {m.platform}
                      </span>
                      {guests.length > 0 && (
                        <span className="truncate">
                          {guests.length === 1 ? guests[0] : `${guests.length} guests`}
                        </span>
                      )}
                    </span>
                  </span>

                  <button
                    onClick={() => setEditing(isEditing ? null : m.id)}
                    aria-expanded={isEditing}
                    className="flex shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-[6px] text-[12.5px] font-medium"
                    style={{
                      background: mode === "off" ? "var(--surface-2)" : "var(--accent-soft)",
                      color: mode === "off" ? "var(--ink-3)" : "var(--accent-ink)",
                      border: `1px solid ${overridden ? "var(--accent-line)" : "transparent"}`,
                    }}
                  >
                    <Icon name={mode === "off" ? "close" : "live"} size={12} />
                    {modeInfo.label}
                    <Icon name="chevronDown" size={11} />
                  </button>
                </div>

                {isEditing && (
                  <div
                    className="fade-up mt-2.5 pt-2.5"
                    style={{ borderTop: "1px solid var(--line)" }}
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      {CAPTURE_MODES.map((c) => {
                        const picked = c.key === mode;
                        return (
                          <button
                            key={c.key}
                            onClick={() => {
                              overlay.setCaptureChoice(m.id, c.key);
                              setEditing(null);
                            }}
                            title={c.hint}
                            className="rounded-full px-2.5 py-[5px] text-[12px] font-medium"
                            style={{
                              background: picked ? "var(--accent)" : "var(--surface-2)",
                              color: picked ? "var(--on-accent)" : "var(--ink-2)",
                            }}
                          >
                            {c.label}
                          </button>
                        );
                      })}
                      {overridden && (
                        <button
                          onClick={() => {
                            overlay.setCaptureChoice(m.id, m.defaultCapture);
                            setEditing(null);
                          }}
                          className="ml-1 text-[11.5px] underline"
                          style={{ color: "var(--ink-3)" }}
                        >
                          reset
                        </button>
                      )}
                    </div>
                    {/* The rule is stated, not hidden. Fathom's reviewers complain
                        about the bot turning up where it wasn't wanted. */}
                    <p className="text-[11.5px]" style={{ color: "var(--ink-faint)" }}>
                      {overridden ? (
                        <>
                          You overrode the default. The rule would have chosen{" "}
                          <strong>
                            {CAPTURE_MODES.find((c) => c.key === m.defaultCapture)!.label}
                          </strong>{" "}
                          — {m.reason.toLowerCase()}.
                        </>
                      ) : (
                        <>
                          Chosen automatically: <strong>{m.reason}</strong>. Override it here and the
                          choice sticks for this meeting only.
                        </>
                      )}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
