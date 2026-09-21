"use client";

import { useMemo, useRef, useState } from "react";
import { clock } from "@/lib/format";
import type { Chapter, Highlight, Meeting, Person, Segment } from "@/lib/types";
import { Avatar, Icon, speakerVar } from "../ui";

// ---------------------------------------------------------------------------
// The player.
//
// There is no video, because the capture layer is stubbed — the brief permits
// that explicitly. What is NOT stubbed is everything a player is actually for:
// a clock, a scrubber you can scrub, chapter boundaries, markers for clips and
// crosstalk, and a stage that shows who is talking right now.
//
// The speaker-lane minimap under the scrubber is the piece that does not exist
// in the original. On an eight-person hour-long call it answers "what is the
// shape of this meeting" before you have read a word: who dominated, where the
// handoffs are, where everyone piled in at once. That is the navigation
// problem the hard case actually poses.
// ---------------------------------------------------------------------------

interface Props {
  meeting: Meeting;
  chapters: Chapter[];
  highlights: Highlight[];
  segments: Segment[];
  people: Map<string, Person>;
  currentMs: number;
  playing: boolean;
  rate: number;
  activeSegment: Segment | null;
  activeChapter: Chapter | undefined;
  onSeek: (ms: number, opts?: { play?: boolean }) => void;
  onTogglePlay: () => void;
  onRate: (r: number) => void;
}

export function Player({
  meeting,
  chapters,
  highlights,
  segments,
  people,
  currentMs,
  playing,
  rate,
  activeSegment,
  activeChapter,
  onSeek,
  onTogglePlay,
  onRate,
}: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const [hoverMs, setHoverMs] = useState<number | null>(null);
  const [scrubbing, setScrubbing] = useState(false);

  const dur = meeting.durationMs;
  const pos = dur ? currentMs / dur : 0;

  const roster = useMemo(
    () =>
      meeting.participants
        .map((p) => ({ part: p, person: people.get(p.personId)! }))
        .filter((x) => x.person)
        .sort((a, b) => b.part.talkMs - a.part.talkMs),
    [meeting.participants, people],
  );

  // Per-speaker lanes. Segments are bucketed into a fixed number of columns so
  // the minimap renders in O(columns) rather than O(segments) — a 332-segment
  // call would otherwise mean 332 absolutely-positioned divs.
  const COLS = 260;
  const lanes = useMemo(() => {
    const byPerson = new Map<string, Float32Array>();
    for (const { person } of roster) byPerson.set(person.id, new Float32Array(COLS));
    const colMs = dur / COLS;
    for (const s of segments) {
      const arr = byPerson.get(s.speakerId);
      if (!arr) continue;
      const from = Math.floor(s.startMs / colMs);
      const to = Math.min(COLS - 1, Math.floor(s.endMs / colMs));
      for (let i = from; i <= to; i++) arr[i] = Math.max(arr[i], s.crosstalk ? 0.62 : 1);
    }
    return roster.map(({ person }) => ({ person, cells: byPerson.get(person.id)! }));
  }, [roster, segments, dur]);

  const crosstalkRuns = useMemo(
    () => segments.filter((s) => s.crosstalk).map((s) => s.startMs / dur),
    [segments, dur],
  );

  function msFromEvent(e: { clientX: number }) {
    const el = barRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * dur;
  }

  const hoverChapter =
    hoverMs != null ? chapters.find((c) => hoverMs >= c.startMs && hoverMs <= c.endMs) : undefined;

  return (
    <div
      className="overflow-hidden rounded-[var(--radius-lg)]"
      style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}
    >
      {/* ---- stage ---- */}
      <div
        className="relative px-4 pt-4 pb-3"
        style={{ background: "var(--bg-sunken)", borderBottom: "1px solid var(--line)" }}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-[3px] text-[11px] font-medium"
            style={{ background: "var(--surface-2)", color: "var(--ink-3)", border: "1px solid var(--line)" }}
            title="The recording bot is simulated for this rebuild — see /about"
          >
            <Icon name="warn" size={11} /> Simulated capture
          </span>
          {activeChapter && (
            <span className="truncate text-[12px] font-medium" style={{ color: "var(--ink-3)" }}>
              {activeChapter.title}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {roster.map(({ person, part }) => {
            const active = activeSegment?.speakerId === person.id;
            return (
              <button
                key={person.id}
                onClick={() => {
                  const next = segments.find((s) => s.speakerId === person.id && s.startMs > currentMs + 400);
                  const target = next ?? segments.find((s) => s.speakerId === person.id);
                  if (target) onSeek(target.startMs);
                }}
                title={`${person.name} — jump to their next turn`}
                className="flex min-w-[112px] flex-1 items-center gap-2 rounded-[var(--radius)] px-2.5 py-2 text-left transition-all"
                style={{
                  background: active ? "var(--surface)" : "transparent",
                  border: `1px solid ${active ? speakerVar(person.hue) : "var(--line)"}`,
                  boxShadow: active ? "var(--shadow-md)" : undefined,
                  opacity: part.attended ? 1 : 0.45,
                }}
              >
                <Avatar person={person} size={26} dim={!part.attended} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-medium" style={{ color: "var(--ink)" }}>
                    {person.name.split(" ")[0]}
                    {person.external && (
                      <span className="ml-1 text-[10px]" style={{ color: "var(--violet)" }}>
                        ext
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-[10.5px] tnum" style={{ color: "var(--ink-faint)" }}>
                    {part.attended ? `${Math.round(part.talkMs / 60000)}m talk` : "didn’t speak"}
                  </span>
                </span>
                {active && <Speaking hue={person.hue} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- transport ---- */}
      <div className="px-4 pt-3 pb-3.5">
        <div className="flex items-center gap-3">
          <button
            onClick={onTogglePlay}
            aria-label={playing ? "Pause" : "Play"}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition-transform active:scale-95"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            <Icon name={playing ? "pause" : "play"} size={15} />
          </button>
          <button onClick={() => onSeek(currentMs - 10000)} aria-label="Back 10 seconds" style={{ color: "var(--ink-3)" }}>
            <Icon name="skipBack" />
          </button>
          <button onClick={() => onSeek(currentMs + 10000)} aria-label="Forward 10 seconds" style={{ color: "var(--ink-3)" }}>
            <Icon name="skipFwd" />
          </button>

          <span className="shrink-0 text-[12.5px] font-medium tnum" style={{ color: "var(--ink-2)" }}>
            {clock(currentMs)}
            <span style={{ color: "var(--ink-faint)" }}> / {clock(dur)}</span>
          </span>

          <div className="ml-auto flex items-center gap-1">
            {[1, 1.25, 1.5, 2].map((r) => (
              <button
                key={r}
                onClick={() => onRate(r)}
                aria-pressed={rate === r}
                className="rounded-[6px] px-1.5 py-[3px] text-[11.5px] font-medium tnum"
                style={{
                  background: rate === r ? "var(--accent-soft)" : "transparent",
                  color: rate === r ? "var(--accent-ink)" : "var(--ink-faint)",
                }}
              >
                {r}×
              </button>
            ))}
          </div>
        </div>

        {/* ---- scrubber ---- */}
        <div
          ref={barRef}
          role="slider"
          tabIndex={0}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(dur / 1000)}
          aria-valuenow={Math.round(currentMs / 1000)}
          aria-valuetext={clock(currentMs)}
          className="relative mt-3 cursor-pointer touch-none py-2"
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            setScrubbing(true);
            onSeek(msFromEvent(e));
          }}
          onPointerMove={(e) => {
            setHoverMs(msFromEvent(e));
            if (scrubbing) onSeek(msFromEvent(e));
          }}
          onPointerUp={() => setScrubbing(false)}
          onPointerLeave={() => {
            setHoverMs(null);
            setScrubbing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") onSeek(currentMs - 5000);
            if (e.key === "ArrowRight") onSeek(currentMs + 5000);
          }}
        >
          {/* chapter track */}
          <div className="flex h-[7px] gap-[2px] overflow-hidden rounded-full">
            {chapters.map((c) => {
              const w = ((c.endMs - c.startMs) / dur) * 100;
              const isActive = activeChapter?.id === c.id;
              const filled = Math.max(0, Math.min(1, (currentMs - c.startMs) / (c.endMs - c.startMs)));
              return (
                <div
                  key={c.id}
                  className="relative h-full overflow-hidden rounded-full transition-colors"
                  style={{ width: `${w}%`, background: isActive ? "var(--accent-line)" : "var(--surface-hover)" }}
                  title={c.title}
                >
                  <div
                    className="absolute inset-y-0 left-0"
                    style={{ width: `${filled * 100}%`, background: "var(--accent)" }}
                  />
                </div>
              );
            })}
          </div>

          {/* clip markers */}
          {highlights.map((h) => (
            <span
              key={h.id}
              title={h.title}
              className="absolute top-[1px] h-[3px] rounded-full"
              style={{
                left: `${(h.startMs / dur) * 100}%`,
                width: `${Math.max(0.35, ((h.endMs - h.startMs) / dur) * 100)}%`,
                background: "var(--violet)",
              }}
            />
          ))}

          {/* crosstalk ticks — where the diarizer is least sure */}
          {crosstalkRuns.map((p, i) => (
            <span
              key={i}
              title="Overlapping speech"
              className="absolute bottom-[3px] h-[3px] w-[2px] rounded-full"
              style={{ left: `${p * 100}%`, background: "var(--warn)" }}
            />
          ))}

          {/* playhead */}
          <span
            className="pointer-events-none absolute top-[3px] h-[13px] w-[3px] -translate-x-1/2 rounded-full"
            style={{ left: `${pos * 100}%`, background: "var(--ink)", boxShadow: "0 0 0 2px var(--surface)" }}
          />

          {hoverMs != null && (
            <div
              className="pointer-events-none absolute bottom-full z-10 mb-1 -translate-x-1/2 rounded-[var(--radius-sm)] px-2 py-1 text-[11px] whitespace-nowrap"
              style={{
                left: `${(hoverMs / dur) * 100}%`,
                background: "var(--ink)",
                color: "var(--bg)",
                boxShadow: "var(--shadow-md)",
              }}
            >
              <span className="tnum font-medium">{clock(hoverMs)}</span>
              {hoverChapter && <span className="opacity-70"> · {hoverChapter.title}</span>}
            </div>
          )}
        </div>

        {/* ---- speaker lanes ---- */}
        <div className="mt-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10.5px] font-semibold tracking-[0.06em] uppercase" style={{ color: "var(--ink-faint)" }}>
              Who spoke when
            </span>
            <span className="text-[10.5px]" style={{ color: "var(--ink-faint)" }}>
              amber = overlapping speech
            </span>
          </div>
          <div className="flex flex-col gap-[3px]">
            {lanes.map(({ person, cells }) => (
              <div key={person.id} className="flex items-center gap-2">
                <span
                  className="w-[52px] shrink-0 truncate text-[10.5px] font-medium"
                  style={{ color: "var(--ink-faint)" }}
                  title={person.name}
                >
                  {person.name.split(" ")[0]}
                </span>
                <div
                  className="relative flex h-[9px] flex-1 gap-px overflow-hidden rounded-[3px]"
                  style={{ background: "var(--surface-2)" }}
                >
                  {Array.from(cells).map((v, i) =>
                    v > 0 ? (
                      <span
                        key={i}
                        className="absolute top-0 bottom-0"
                        style={{
                          left: `${(i / COLS) * 100}%`,
                          width: `${100 / COLS + 0.06}%`,
                          background: v < 1 ? "var(--warn)" : speakerVar(person.hue),
                          opacity: v < 1 ? 0.95 : 0.85,
                        }}
                      />
                    ) : null,
                  )}
                  <span
                    className="pointer-events-none absolute inset-y-0 w-[2px]"
                    style={{ left: `${pos * 100}%`, background: "var(--ink)", opacity: 0.5 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Three bars that animate while someone is the active speaker. */
function Speaking({ hue }: { hue: number }) {
  return (
    <span className="flex items-end gap-[2px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[2.5px] rounded-full"
          style={{
            background: speakerVar(hue),
            height: [7, 11, 8][i],
            animation: `speakBar .75s ${i * 0.13}s ease-in-out infinite alternate`,
          }}
        />
      ))}
      <style>{`@keyframes speakBar{from{transform:scaleY(.4)}to{transform:scaleY(1)}}`}</style>
    </span>
  );
}
