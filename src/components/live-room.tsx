"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { clock } from "@/lib/format";
import type { Chapter, HighlightCategory, Meeting, Person, Segment } from "@/lib/types";
import { Avatar, Badge, Icon, speakerVar } from "./ui";
import { PageHeader } from "./page-header";
import { mapTone } from "@/lib/tone";

// ---------------------------------------------------------------------------
// Live mode.
//
// The capture layer is stubbed — the brief allows it — but stubbing capture
// should not mean stubbing the *experience* of capture. A static fixture
// cannot demonstrate the one interaction that only exists during a call:
// hitting highlight while somebody is still talking.
//
// So this streams the real transcript against a clock at 8× and gives you the
// thing Fathom's own bot-free experience currently doesn't have at all — a
// mid-call highlight button.
//
// The boundary logic is copied from Fathom's, because it is the cleverest
// thing in their product: pressing highlight does not mark "now". It walks
// BACKWARDS to where the current speaker started talking, so you capture the
// point somebody just made rather than the silence after it. You press the
// button when you realise it mattered, which is always a few seconds late.
// ---------------------------------------------------------------------------

const SPEED = 8;

interface LiveHighlight {
  id: string;
  categoryKey: string;
  startMs: number;
  endMs: number;
  text: string;
  speakerId: string;
  pressedAtMs: number;
}

export function LiveRoom({
  meeting,
  segments,
  chapters,
  people,
  categories,
}: {
  meeting: Meeting;
  segments: Segment[];
  chapters: Chapter[];
  people: Person[];
  categories: HighlightCategory[];
}) {
  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [highlights, setHighlights] = useState<LiveHighlight[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const raf = useRef<number | null>(null);
  const last = useRef(0);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!running) return;
    last.current = performance.now();
    const tick = (now: number) => {
      const dt = (now - last.current) * SPEED;
      last.current = now;
      setElapsed((e) => {
        const next = e + dt;
        if (next >= meeting.durationMs) {
          setRunning(false);
          return meeting.durationMs;
        }
        return next;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [running, meeting.durationMs]);

  const said = useMemo(() => segments.filter((s) => s.startMs <= elapsed), [segments, elapsed]);
  const current = said[said.length - 1];
  const chapter = chapters.find((c) => elapsed >= c.startMs && elapsed <= c.endMs);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [said.length]);

  /**
   * Retroactive boundary detection.
   *
   * Walk back from the press to the START of the current speaker's turn —
   * across all their consecutive segments, not just the one being spoken.
   * If the press lands in a gap, take the turn that just finished.
   */
  // The id counter lives in a ref rather than reading the clock: a highlight's
  // identity has nothing to do with the wall clock, and Date.now() inside a
  // component body is the kind of thing that bites you under Strict Mode.
  const nextHighlightId = useRef(1);

  function markHighlight(categoryKey: string) {
    if (!said.length) return;
    const at = elapsed;
    let i = said.length - 1;
    const speaker = said[i].speakerId;
    while (i > 0 && said[i - 1].speakerId === speaker) i--;
    const start = said[i];
    const end = said[said.length - 1];

    const h: LiveHighlight = {
      id: `lh-${nextHighlightId.current++}`,
      categoryKey,
      startMs: start.startMs,
      endMs: Math.max(end.endMs, at),
      text: said
        .slice(i)
        .map((s) => s.text)
        .join(" ")
        .slice(0, 190),
      speakerId: speaker,
      pressedAtMs: at,
    };
    setHighlights((hs) => [h, ...hs]);
    setFlash(h.id);
    setTimeout(() => setFlash(null), 1400);
  }

  const speakingNow = current ? peopleById.get(current.speakerId) : undefined;
  const wordsSoFar = said.reduce((a, s) => a + s.text.split(/\s+/).length, 0);

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-24 md:px-8">
      <PageHeader
        title="Live"
        subtitle="The capture bot is simulated — but the mid-call experience is not. This streams a real transcript at 8× so the in-meeting highlight actually works."
        actions={
          <button
            onClick={() => {
              if (elapsed >= meeting.durationMs) {
                setElapsed(0);
                setHighlights([]);
              }
              setRunning((r) => !r);
            }}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3.5 py-[8px] text-[13px] font-semibold"
            style={{
              background: running ? "var(--danger)" : "var(--accent)",
              color: "var(--on-accent)",
            }}
          >
            <Icon name={running ? "pause" : "play"} size={14} />
            {running ? "Pause" : elapsed > 0 ? "Resume" : "Join the call"}
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          {/* status bar */}
          <div
            className="mb-3 flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] px-4 py-3"
            style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
          >
            <span className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${running ? "live-dot" : ""}`}
                style={{ background: running ? "var(--danger)" : "var(--ink-faint)" }}
              />
              <span className="text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
                {running ? "Recording" : elapsed > 0 ? "Paused" : "Not started"}
              </span>
            </span>
            <span className="text-[13px] font-medium tnum" style={{ color: "var(--ink-2)" }}>
              {clock(elapsed)}
            </span>
            {chapter && (
              <span className="truncate text-[12.5px]" style={{ color: "var(--ink-3)" }}>
                {chapter.title}
              </span>
            )}
            <span className="ml-auto text-[11.5px] tnum" style={{ color: "var(--ink-faint)" }}>
              {wordsSoFar.toLocaleString()} words · {said.length} lines
            </span>
          </div>

          {/* participants */}
          <div
            className="mb-3 flex flex-wrap gap-2 rounded-[var(--radius-lg)] p-3"
            style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
          >
            {people.map((p) => {
              const active = current?.speakerId === p.id;
              return (
                <span
                  key={p.id}
                  className="flex items-center gap-2 rounded-[var(--radius)] px-2.5 py-1.5 transition-all"
                  style={{
                    background: active ? "var(--surface-2)" : "transparent",
                    border: `1px solid ${active ? speakerVar(p.hue) : "var(--line)"}`,
                  }}
                >
                  <Avatar person={p} size={22} ring={active} />
                  <span className="text-[12.5px] font-medium">{p.name.split(" ")[0]}</span>
                </span>
              );
            })}
          </div>

          {/* feed */}
          <div
            ref={feedRef}
            className="scroll-thin h-[46vh] min-h-[320px] overflow-y-auto rounded-[var(--radius-lg)] p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
          >
            {!said.length && (
              <p className="py-16 text-center text-[13px]" style={{ color: "var(--ink-3)" }}>
                Press <strong>Join the call</strong> and the transcript starts arriving.
              </p>
            )}
            {said.slice(-70).map((s, i, arr) => {
              const p = peopleById.get(s.speakerId);
              const isLast = i === arr.length - 1;
              const newSpeaker = i === 0 || arr[i - 1].speakerId !== s.speakerId;
              return (
                <div key={s.id} className={isLast ? "fade-up" : undefined}>
                  {newSpeaker && p && (
                    <div className="mt-2.5 mb-0.5 flex items-center gap-1.5">
                      <Avatar person={p} size={17} />
                      <span className="text-[12.5px] font-semibold" style={{ color: speakerVar(p.hue) }}>
                        {p.name}
                      </span>
                      <span className="text-[10.5px] tnum" style={{ color: "var(--ink-faint)" }}>
                        {clock(s.startMs)}
                      </span>
                    </div>
                  )}
                  <p
                    className="text-[13.5px] leading-[1.6]"
                    style={{ color: isLast ? "var(--ink)" : "var(--ink-2)" }}
                  >
                    {s.text}
                  </p>
                </div>
              );
            })}
          </div>

          {/* the highlight bar */}
          <div
            className="mt-3 rounded-[var(--radius-lg)] p-3"
            style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[12.5px] font-semibold" style={{ color: "var(--ink)" }}>
                Highlight what was just said
              </span>
              <span className="text-[11.5px]" style={{ color: "var(--ink-faint)" }}>
                captures backwards to the start of {speakingNow?.name.split(" ")[0] ?? "the speaker"}
                ’s turn — press it late, it still works
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => {
                const tone = mapTone(c.color);
                return (
                  <button
                    key={c.key}
                    onClick={() => markHighlight(c.key)}
                    disabled={!said.length}
                    className="rounded-full px-3 py-[6px] text-[12.5px] font-medium transition-transform active:scale-95 disabled:opacity-40"
                    style={{ background: `var(--${tone}-soft)`, color: `var(--${tone})` }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* right rail: live summary + captured highlights */}
        <aside className="flex flex-col gap-3">
          <div
            className="rounded-[var(--radius-lg)] p-3.5"
            style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
          >
            <div className="mb-2 flex items-center gap-2">
              <Icon name="sparkle" size={14} />
              <span className="text-[13px] font-semibold">Live notes</span>
              {running && <Badge tone="accent">updating</Badge>}
            </div>
            {chapters.filter((c) => c.startMs <= elapsed).length === 0 ? (
              <p className="text-[12.5px]" style={{ color: "var(--ink-3)" }}>
                Notes appear as topics close out.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {chapters
                  .filter((c) => c.startMs <= elapsed)
                  .reverse()
                  .map((c) => {
                    const done = c.endMs <= elapsed;
                    return (
                      <li key={c.id} className="flex gap-2">
                        <span
                          className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: done ? "var(--accent)" : "var(--warn)" }}
                        />
                        <span>
                          <span className="block text-[12.5px] font-medium" style={{ color: "var(--ink-2)" }}>
                            {c.title}
                          </span>
                          <span className="block text-[11.5px] leading-snug" style={{ color: "var(--ink-faint)" }}>
                            {done ? c.gist : "in progress…"}
                          </span>
                        </span>
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>

          <div
            className="rounded-[var(--radius-lg)] p-3.5"
            style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
          >
            <div className="mb-2 flex items-center gap-2">
              <Icon name="clip" size={14} />
              <span className="text-[13px] font-semibold">Your highlights</span>
              <span className="ml-auto text-[11.5px] tnum" style={{ color: "var(--ink-faint)" }}>
                {highlights.length}
              </span>
            </div>

            {!highlights.length && (
              <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--ink-3)" }}>
                Nothing yet. When somebody says something that matters, hit a button below the
                transcript — it grabs the whole point, not just the moment you pressed.
              </p>
            )}

            <ul className="flex flex-col gap-2">
              {highlights.map((h) => {
                const p = peopleById.get(h.speakerId);
                const cat = categories.find((c) => c.key === h.categoryKey);
                const tone = mapTone(cat?.color ?? "sky");
                return (
                  <li
                    key={h.id}
                    className={`rounded-[var(--radius)] p-2.5 ${flash === h.id ? "fade-up" : ""}`}
                    style={{
                      background: flash === h.id ? "var(--accent-soft)" : "var(--surface-2)",
                      transition: "background .6s",
                    }}
                  >
                    <div className="mb-1 flex items-center gap-1.5">
                      <span
                        className="rounded-full px-1.5 py-[1px] text-[10px] font-semibold"
                        style={{ background: `var(--${tone}-soft)`, color: `var(--${tone})` }}
                      >
                        {cat?.label}
                      </span>
                      <span className="text-[10.5px] tnum" style={{ color: "var(--ink-faint)" }}>
                        {clock(h.startMs)}–{clock(h.endMs)}
                      </span>
                      <span
                        className="ml-auto text-[10px] tnum"
                        style={{ color: "var(--ink-faint)" }}
                        title="How far back the boundary detection reached from your press"
                      >
                        −{Math.round((h.pressedAtMs - h.startMs) / 1000)}s
                      </span>
                    </div>
                    {p && (
                      <div className="mb-0.5 flex items-center gap-1.5">
                        <Avatar person={p} size={14} />
                        <span className="text-[11.5px] font-medium" style={{ color: speakerVar(p.hue) }}>
                          {p.name.split(" ")[0]}
                        </span>
                      </div>
                    )}
                    <p className="text-[12px] leading-snug" style={{ color: "var(--ink-3)" }}>
                      {h.text}
                      {h.text.length >= 190 && "…"}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
