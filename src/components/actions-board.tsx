"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useOverlay } from "@/lib/overlay";
import { clock, when } from "@/lib/format";
import type { ActionItem, Person } from "@/lib/types";
import { Avatar, Badge, Icon } from "./ui";
import { PageHeader } from "./page-header";

type Row = ActionItem & { meetingTitle: string; meetingStartedAt: string };

// Action items across every meeting, grouped by the person who owns them.
//
// Fathom has no view like this — action items live inside the call they came
// from, so "what did I commit to this month" means opening nine recordings.
// Once each item carries an assignee and an anchor, the cross-meeting view is
// almost free, and it is the thing a user would actually check on a Monday.

export function ActionsBoard({ rows, people }: { rows: Row[]; people: Person[] }) {
  const overlay = useOverlay();
  const [showDone, setShowDone] = useState(false);
  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  const isDone = (a: Row) => overlay.state.actionsDone[a.id] ?? a.done;

  const groups = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const r of rows) {
      if (!showDone && isDone(r)) continue;
      const key = r.assigneeId ?? "unassigned";
      m.set(key, [...(m.get(key) ?? []), r]);
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, showDone, overlay.state.actionsDone]);

  const open = rows.filter((r) => !isDone(r)).length;

  return (
    <div className="mx-auto w-full max-w-[940px] px-4 pb-24 md:px-8">
      <PageHeader
        title="Action items"
        subtitle={`${open} open across ${new Set(rows.map((r) => r.meetingId)).size} meetings. Every one links back to the moment it was committed to.`}
        actions={
          <button
            onClick={() => setShowDone((v) => !v)}
            aria-pressed={showDone}
            className="rounded-[var(--radius-sm)] px-3 py-[7px] text-[13px] font-medium"
            style={{
              background: showDone ? "var(--accent-soft)" : "var(--surface)",
              color: showDone ? "var(--accent-ink)" : "var(--ink-2)",
              border: "1px solid var(--line)",
            }}
          >
            {showDone ? "Hide done" : "Show done"}
          </button>
        }
      />

      <div className="flex flex-col gap-5">
        {groups.map(([personId, items]) => {
          const p = peopleById.get(personId);
          return (
            <section key={personId}>
              <div className="mb-2 flex items-center gap-2">
                {p ? <Avatar person={p} size={24} /> : <Icon name="user" />}
                <h2 className="text-[14px] font-semibold" style={{ color: "var(--ink)" }}>
                  {p?.name ?? "Unassigned"}
                </h2>
                <span className="text-[12px] tnum" style={{ color: "var(--ink-faint)" }}>
                  {items.filter((i) => !isDone(i)).length} open
                </span>
              </div>

              <ul
                className="overflow-hidden rounded-[var(--radius-lg)]"
                style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
              >
                {items.map((a, i) => {
                  const done = isDone(a);
                  return (
                    <li
                      key={a.id}
                      className="flex items-start gap-2.5 px-3 py-2.5"
                      style={{ borderTop: i ? "1px solid var(--line)" : undefined }}
                    >
                      <button
                        onClick={() => overlay.setActionDone(a.id, !done)}
                        role="checkbox"
                        aria-checked={done}
                        aria-label={done ? `Reopen: ${a.text}` : `Complete: ${a.text}`}
                        className="mt-[2px] grid h-[17px] w-[17px] shrink-0 place-items-center rounded-[5px]"
                        style={{
                          background: done ? "var(--ok)" : "transparent",
                          border: `1.5px solid ${done ? "var(--ok)" : "var(--line-strong)"}`,
                          color: "white",
                        }}
                      >
                        {done && <Icon name="check" size={11} />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <span
                          className="block text-[13.5px] leading-[1.5]"
                          style={{
                            color: done ? "var(--ink-faint)" : "var(--ink-2)",
                            textDecoration: done ? "line-through" : undefined,
                          }}
                        >
                          {a.text}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px]">
                          <Link
                            href={`/m/${a.meetingId}?t=${Math.round(a.anchorMs)}`}
                            className="hover:underline"
                            style={{ color: "var(--accent-ink)" }}
                          >
                            {a.meetingTitle} <span className="tnum">· {clock(a.anchorMs)}</span>
                          </Link>
                          <span style={{ color: "var(--ink-faint)" }}>{when(a.meetingStartedAt)}</span>
                          {a.dueHint && <Badge tone="warn">{a.dueHint}</Badge>}
                          {a.userGenerated && <Badge>added by hand</Badge>}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        {!groups.length && (
          <div
            className="rounded-[var(--radius-lg)] px-6 py-14 text-center"
            style={{ background: "var(--surface)", border: "1px dashed var(--line-strong)" }}
          >
            <p className="text-[14px] font-medium">Everything is done</p>
            <p className="mt-1 text-[13px]" style={{ color: "var(--ink-3)" }}>
              Turn on “Show done” to see what was cleared.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
