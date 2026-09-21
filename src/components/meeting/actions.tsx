"use client";

import { useState } from "react";
import { useOverlay } from "@/lib/overlay";
import { clock } from "@/lib/format";
import type { ActionItem, Person } from "@/lib/types";
import { Avatar, Icon } from "../ui";

interface Props {
  meetingId: string;
  items: ActionItem[];
  people: Map<string, Person>;
  rosterIds: string[];
  currentMs: number;
  onSeek: (ms: number, opts?: { play?: boolean }) => void;
}

export function ActionsPane({ meetingId, items, people, rosterIds, currentMs, onSeek }: Props) {
  const overlay = useOverlay();
  const [draft, setDraft] = useState("");
  const [assignee, setAssignee] = useState<string>(rosterIds[0] ?? "");

  const added = overlay.state.addedActions
    .filter((a) => a.meetingId === meetingId)
    .map<ActionItem>((a) => ({
      id: a.id,
      meetingId,
      text: a.text,
      assigneeId: a.assigneeId,
      anchorMs: a.anchorMs,
      done: false,
      userGenerated: true,
    }));

  const all = [...items, ...added].sort((a, b) => a.anchorMs - b.anchorMs);
  const isDone = (a: ActionItem) => overlay.state.actionsDone[a.id] ?? a.done;
  const open = all.filter((a) => !isDone(a));
  const done = all.filter(isDone);

  return (
    <div className="p-3.5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          overlay.addAction(meetingId, draft.trim(), assignee || null, Math.round(currentMs));
          setDraft("");
        }}
        className="mb-3 flex flex-col gap-1.5 rounded-[var(--radius)] p-2"
        style={{ background: "var(--surface-2)" }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add an action item…"
          aria-label="New action item"
          className="w-full bg-transparent px-1 py-1 text-[13px] outline-none"
          style={{ color: "var(--ink)" }}
        />
        <div className="flex items-center gap-1.5">
          <select
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            aria-label="Assignee"
            className="rounded-[6px] px-1.5 py-[3px] text-[11.5px]"
            style={{ background: "var(--surface)", color: "var(--ink-2)", border: "1px solid var(--line)" }}
          >
            {rosterIds.map((id) => {
              const p = people.get(id);
              return p ? (
                <option key={id} value={id}>
                  {p.name}
                </option>
              ) : null;
            })}
          </select>
          <span className="text-[11px] tnum" style={{ color: "var(--ink-faint)" }}>
            anchors at {clock(currentMs)}
          </span>
          <button
            type="submit"
            disabled={!draft.trim()}
            className="ml-auto rounded-[6px] px-2.5 py-[4px] text-[12px] font-medium disabled:opacity-40"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            Add
          </button>
        </div>
      </form>

      {open.length > 0 && (
        <ul className="mb-4 flex flex-col gap-1">
          {open.map((a) => (
            <Row key={a.id} a={a} people={people} onSeek={onSeek} done={false} />
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <>
          <div className="mb-1.5 text-[11px] font-semibold tracking-[0.06em] uppercase" style={{ color: "var(--ink-faint)" }}>
            Done · {done.length}
          </div>
          <ul className="flex flex-col gap-1">
            {done.map((a) => (
              <Row key={a.id} a={a} people={people} onSeek={onSeek} done />
            ))}
          </ul>
        </>
      )}

      {!all.length && (
        <p className="py-8 text-center text-[13px]" style={{ color: "var(--ink-3)" }}>
          No action items came out of this one.
        </p>
      )}
    </div>
  );
}

function Row({
  a,
  people,
  onSeek,
  done,
}: {
  a: ActionItem;
  people: Map<string, Person>;
  onSeek: (ms: number, opts?: { play?: boolean }) => void;
  done: boolean;
}) {
  const overlay = useOverlay();
  const who = a.assigneeId ? people.get(a.assigneeId) : undefined;

  return (
    <li className="group flex items-start gap-2 rounded-[var(--radius-sm)] p-1.5 transition-colors hover:bg-[var(--surface-2)]">
      <button
        onClick={() => overlay.setActionDone(a.id, !done)}
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Mark "${a.text}" not done` : `Mark "${a.text}" done`}
        className="mt-[2px] grid h-[17px] w-[17px] shrink-0 place-items-center rounded-[5px] transition-colors"
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
          className="block text-[13px] leading-[1.5]"
          style={{
            color: done ? "var(--ink-faint)" : "var(--ink-2)",
            textDecoration: done ? "line-through" : undefined,
          }}
        >
          {a.text}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]" style={{ color: "var(--ink-faint)" }}>
          {who && (
            <span className="flex items-center gap-1">
              <Avatar person={who} size={13} /> {who.name.split(" ")[0]}
            </span>
          )}
          {a.dueHint && <span>· {a.dueHint}</span>}
          <button
            onClick={() => onSeek(a.anchorMs, { play: true })}
            className="tnum hover:underline"
            style={{ color: "var(--accent-ink)" }}
            title="Jump to where this was committed to"
          >
            {clock(a.anchorMs)}
          </button>
          {a.userGenerated && <span style={{ color: "var(--ink-faint)" }}>· added by hand</span>}
        </span>
      </div>
    </li>
  );
}
