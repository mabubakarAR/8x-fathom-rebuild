"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOverlay } from "@/lib/overlay";
import { clock } from "@/lib/format";
import { CONFIDENCE_THRESHOLD } from "@/lib/types";
import type { Chapter, Highlight, HighlightCategory, Person, Segment } from "@/lib/types";
import { Avatar, Badge, Icon, speakerVar } from "../ui";
import { mapTone } from "@/lib/tone";

// ---------------------------------------------------------------------------
// The transcript.
//
// Fathom's best structural idea is that the transcript — not the video
// scrubber — is the primary editing surface: you clip from it, you trim from
// it, and the hover affordance lives in the left gutter. That is kept almost
// verbatim, including the drag-to-extend range, because it is genuinely good.
//
// Three things are added, all of them aimed at the hour-long eight-person call:
//
//   SPEAKER REPAIR that back-propagates. The best-corroborated complaint about
//   Fathom is misattribution under crosstalk. Correcting one line is busywork;
//   correcting every line attributed to that voice is a fix.
//
//   CONFIDENCE MADE VISIBLE. Low-confidence lines are marked, filterable, and
//   counted. A transcript that hides its own uncertainty is how you end up
//   with a summary built on a misheard number.
//
//   FOLLOW MODE that yields. Auto-scroll stops the moment you scroll away and
//   offers to resume, instead of fighting you for the scroll position.
// ---------------------------------------------------------------------------

interface Props {
  meetingId: string;
  segments: Segment[];
  chapters: Chapter[];
  people: Map<string, Person>;
  rosterIds: string[];
  categories: HighlightCategory[];
  currentMs: number;
  activeSegmentId: string | null;
  follow: boolean;
  onFollowChange: (v: boolean) => void;
  onSeek: (ms: number, opts?: { play?: boolean }) => void;
  onShareRange: (r: { startMs: number; endMs: number; title: string }) => void;
}

export function Transcript({
  meetingId,
  segments,
  chapters,
  people,
  rosterIds,
  categories,
  currentMs,
  activeSegmentId,
  follow,
  onFollowChange,
  onSeek,
  onShareRange,
}: Props) {
  const overlay = useOverlay();
  const scroller = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const programmatic = useRef(false);

  const [onlyShaky, setOnlyShaky] = useState(false);
  const [speakerFilter, setSpeakerFilter] = useState<string | null>(null);
  const [composer, setComposer] = useState<{ anchorIndex: number; span: number } | null>(null);
  const [repair, setRepair] = useState<string | null>(null);

  // Effective speaker for a segment, applying the viewer's corrections.
  const fixes = overlay.state.speakerFixes[meetingId] ?? [];
  const fixMap = useMemo(() => new Map(fixes.map((f) => [f.segmentId, f.toSpeakerId])), [fixes]);
  const speakerOf = useCallback(
    (s: Segment) => fixMap.get(s.id) ?? s.speakerId,
    [fixMap],
  );

  const visible = useMemo(() => {
    return segments.filter((s) => {
      if (onlyShaky && s.confidence >= CONFIDENCE_THRESHOLD) return false;
      if (speakerFilter && speakerOf(s) !== speakerFilter) return false;
      return true;
    });
  }, [segments, onlyShaky, speakerFilter, speakerOf]);

  const shakyCount = segments.filter((s) => s.confidence < CONFIDENCE_THRESHOLD).length;

  // Auto-scroll. Marked programmatic so the scroll listener can tell our own
  // scrolling apart from the user's.
  useEffect(() => {
    if (!follow || !activeRef.current || !scroller.current) return;
    programmatic.current = true;
    activeRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    const t = setTimeout(() => (programmatic.current = false), 700);
    return () => clearTimeout(t);
  }, [activeSegmentId, follow]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => {
      if (programmatic.current) return;
      if (follow) onFollowChange(false);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [follow, onFollowChange]);

  const chapterStarts = useMemo(() => {
    const m = new Map<string, Chapter>();
    for (const c of chapters) {
      const first = segments.find((s) => s.startMs >= c.startMs);
      if (first) m.set(first.id, c);
    }
    return m;
  }, [chapters, segments]);

  function commitHighlight(categoryKey: string) {
    if (!composer) return;
    const start = visible[composer.anchorIndex];
    const endSeg = visible[Math.min(visible.length - 1, composer.anchorIndex + composer.span)];
    if (!start) return;
    const h: Highlight = {
      id: `uh-${Date.now().toString(36)}`,
      meetingId,
      categoryKey,
      startMs: start.startMs,
      endMs: endSeg.endMs,
      title: start.text.slice(0, 68).replace(/\s+\S*$/, "") + (start.text.length > 68 ? "…" : ""),
      createdById: "p-abubakar",
      createdAt: new Date().toISOString(),
    };
    overlay.addHighlight(h);
    setComposer(null);
  }

  return (
    <div
      className="mt-4 overflow-hidden rounded-[var(--radius-lg)]"
      style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}
    >
      {/* ---- toolbar ---- */}
      <div
        className="flex flex-wrap items-center gap-2 px-3 py-2.5"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        <span className="text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
          Transcript
        </span>
        <span className="text-[11.5px] tnum" style={{ color: "var(--ink-faint)" }}>
          {visible.length === segments.length
            ? `${segments.length} lines`
            : `${visible.length} of ${segments.length}`}
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {fixes.length > 0 && (
            <button
              onClick={() => overlay.undoSpeakerFixes(meetingId)}
              className="rounded-full px-2 py-[3px] text-[11px] font-medium"
              style={{ background: "var(--ok-soft)", color: "var(--ok)" }}
              title="Undo every speaker correction on this call"
            >
              {fixes.length} speaker {fixes.length === 1 ? "fix" : "fixes"} · undo
            </button>
          )}

          <select
            value={speakerFilter ?? ""}
            onChange={(e) => setSpeakerFilter(e.target.value || null)}
            aria-label="Filter by speaker"
            className="rounded-[var(--radius-sm)] px-2 py-[4px] text-[12px]"
            style={{ background: "var(--surface-2)", color: "var(--ink-2)", border: "1px solid var(--line)" }}
          >
            <option value="">Everyone</option>
            {rosterIds.map((id) => {
              const p = people.get(id);
              return p ? (
                <option key={id} value={id}>
                  {p.name}
                </option>
              ) : null;
            })}
          </select>

          {shakyCount > 0 && (
            <button
              onClick={() => setOnlyShaky((v) => !v)}
              aria-pressed={onlyShaky}
              className="flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-[4px] text-[12px] font-medium"
              style={{
                background: onlyShaky ? "var(--warn-soft)" : "var(--surface-2)",
                color: onlyShaky ? "var(--warn)" : "var(--ink-3)",
                border: `1px solid ${onlyShaky ? "transparent" : "var(--line)"}`,
              }}
              title="Lines the transcriber was unsure about — usually crosstalk, accents or jargon"
            >
              <Icon name="warn" size={12} /> {shakyCount} to review
            </button>
          )}

          <button
            onClick={() => onFollowChange(!follow)}
            aria-pressed={follow}
            className="flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-[4px] text-[12px] font-medium"
            style={{
              background: follow ? "var(--accent-soft)" : "var(--surface-2)",
              color: follow ? "var(--accent-ink)" : "var(--ink-3)",
              border: `1px solid ${follow ? "transparent" : "var(--line)"}`,
            }}
          >
            <Icon name={follow ? "dot" : "play"} size={11} /> Follow
          </button>
        </div>
      </div>

      {/* ---- lines ---- */}
      <div ref={scroller} className="scroll-thin max-h-[calc(100vh-230px)] min-h-[380px] overflow-y-auto">
        {visible.length === 0 && (
          <p className="px-5 py-10 text-center text-[13px]" style={{ color: "var(--ink-3)" }}>
            No lines match those filters.
          </p>
        )}

        {visible.map((s, i) => {
          const sid = speakerOf(s);
          const person = people.get(sid);
          const prev = visible[i - 1];
          const newSpeaker = !prev || speakerOf(prev) !== sid;
          const active = s.id === activeSegmentId;
          const shaky = s.confidence < CONFIDENCE_THRESHOLD;
          const chapter = chapterStarts.get(s.id);
          const corrected = fixMap.has(s.id);
          const inComposer =
            composer != null && i >= composer.anchorIndex && i <= composer.anchorIndex + composer.span;

          return (
            <div key={s.id}>
              {chapter && (
                <div
                  className="sticky top-0 z-10 flex items-baseline gap-2 px-4 py-2 backdrop-blur"
                  style={{
                    background: "color-mix(in oklab, var(--surface) 88%, transparent)",
                    borderBottom: "1px solid var(--line)",
                    borderTop: i === 0 ? undefined : "1px solid var(--line)",
                  }}
                >
                  <button
                    onClick={() => onSeek(chapter.startMs)}
                    className="text-[12.5px] font-semibold"
                    style={{ color: "var(--ink)" }}
                  >
                    {chapter.title}
                  </button>
                  <span className="text-[11px] tnum" style={{ color: "var(--ink-faint)" }}>
                    {clock(chapter.startMs)}
                  </span>
                  <span className="ml-auto hidden max-w-[52%] truncate text-[11px] sm:block" style={{ color: "var(--ink-faint)" }}>
                    {chapter.gist}
                  </span>
                </div>
              )}

              <div
                ref={active ? activeRef : undefined}
                className="group relative flex gap-2.5 px-3 py-[5px] transition-colors"
                style={{
                  background: active
                    ? "var(--accent-soft)"
                    : inComposer
                      ? "var(--violet-soft)"
                      : undefined,
                }}
              >
                {/* left gutter: the blue + — Fathom's interaction, kept */}
                <div className="relative w-[18px] shrink-0">
                  <button
                    onClick={() => setComposer({ anchorIndex: i, span: 1 })}
                    aria-label={`Clip from ${clock(s.startMs)}`}
                    className="absolute top-[3px] left-0 grid h-[18px] w-[18px] place-items-center rounded-full opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                  >
                    <Icon name="plus" size={11} />
                  </button>
                </div>

                <button
                  onClick={() => onSeek(s.startMs, { play: true })}
                  className="w-[44px] shrink-0 pt-[3px] text-left text-[11px] tnum tabular-nums"
                  style={{ color: active ? "var(--accent-ink)" : "var(--ink-faint)" }}
                  title="Jump here"
                >
                  {clock(s.startMs)}
                </button>

                <div className="min-w-0 flex-1">
                  {newSpeaker && person && (
                    <div className="mt-1 mb-0.5 flex items-center gap-1.5">
                      <Avatar person={person} size={18} />
                      <button
                        onClick={() => setRepair(repair === s.id ? null : s.id)}
                        className="text-[12.5px] font-semibold"
                        style={{ color: speakerVar(person.hue) }}
                        title="Wrong person? Click to reassign"
                      >
                        {person.name}
                      </button>
                      {corrected && (
                        <span className="text-[10px] font-medium" style={{ color: "var(--ok)" }}>
                          corrected
                        </span>
                      )}
                      {s.crosstalk && (
                        <span className="text-[10px] font-medium" style={{ color: "var(--warn)" }}>
                          overlapping
                        </span>
                      )}
                    </div>
                  )}

                  <p
                    onClick={() => onSeek(s.startMs, { play: true })}
                    className="cursor-pointer text-[13.5px] leading-[1.62]"
                    style={{
                      color: active ? "var(--ink)" : "var(--ink-2)",
                      textDecoration: shaky ? "underline" : undefined,
                      textDecorationStyle: shaky ? "wavy" : undefined,
                      textDecorationColor: shaky ? "var(--warn)" : undefined,
                      textUnderlineOffset: shaky ? "3px" : undefined,
                      textDecorationThickness: shaky ? "1px" : undefined,
                    }}
                    title={shaky ? `Low transcription confidence (${Math.round(s.confidence * 100)}%)` : undefined}
                  >
                    {s.text}
                  </p>

                  {repair === s.id && (
                    <SpeakerRepair
                      segment={s}
                      currentSpeakerId={sid}
                      people={people}
                      rosterIds={rosterIds}
                      sameSpeakerSegmentIds={segments
                        .filter((x) => speakerOf(x) === sid)
                        .map((x) => x.id)}
                      onFix={(to, everywhere) => {
                        if (everywhere) {
                          overlay.fixSpeakerEverywhere(
                            meetingId,
                            sid,
                            to,
                            segments.filter((x) => speakerOf(x) === sid).map((x) => x.id),
                          );
                        } else {
                          overlay.fixSpeaker(meetingId, s.id, to);
                        }
                        setRepair(null);
                      }}
                      onClose={() => setRepair(null)}
                    />
                  )}
                </div>
              </div>

              {composer?.anchorIndex === i && (
                <ClipComposer
                  categories={categories}
                  span={composer.span}
                  maxSpan={Math.min(14, visible.length - 1 - i)}
                  from={s.startMs}
                  to={visible[Math.min(visible.length - 1, i + composer.span)].endMs}
                  onSpan={(span) => setComposer({ anchorIndex: i, span })}
                  onCommit={commitHighlight}
                  onShare={() =>
                    onShareRange({
                      startMs: s.startMs,
                      endMs: visible[Math.min(visible.length - 1, i + composer.span)].endMs,
                      title: s.text.slice(0, 60),
                    })
                  }
                  onCancel={() => setComposer(null)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClipComposer({
  categories,
  span,
  maxSpan,
  from,
  to,
  onSpan,
  onCommit,
  onShare,
  onCancel,
}: {
  categories: HighlightCategory[];
  span: number;
  maxSpan: number;
  from: number;
  to: number;
  onSpan: (n: number) => void;
  onCommit: (categoryKey: string) => void;
  onShare: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fade-up mx-3 my-1.5 rounded-[var(--radius)] p-3"
      style={{ background: "var(--surface-2)", border: "1px solid var(--accent-line)" }}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-semibold" style={{ color: "var(--ink)" }}>
          New clip
        </span>
        <span className="text-[11.5px] tnum" style={{ color: "var(--ink-3)" }}>
          {clock(from)} – {clock(to)} · {Math.round((to - from) / 1000)}s
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => onSpan(Math.max(0, span - 1))}
            disabled={span <= 0}
            className="rounded-[6px] px-2 py-[3px] text-[12px] font-medium disabled:opacity-40"
            style={{ background: "var(--surface)", color: "var(--ink-2)", border: "1px solid var(--line)" }}
            aria-label="Shorten clip by one line"
          >
            −
          </button>
          <span className="text-[11px] tnum" style={{ color: "var(--ink-faint)" }}>
            {span + 1} {span === 0 ? "line" : "lines"}
          </span>
          <button
            onClick={() => onSpan(Math.min(maxSpan, span + 1))}
            disabled={span >= maxSpan}
            className="rounded-[6px] px-2 py-[3px] text-[12px] font-medium disabled:opacity-40"
            style={{ background: "var(--surface)", color: "var(--ink-2)", border: "1px solid var(--line)" }}
            aria-label="Extend clip by one line"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {categories.map((c) => (
          <button
            key={c.key}
            onClick={() => onCommit(c.key)}
            className="rounded-full px-2.5 py-[4px] text-[12px] font-medium transition-transform active:scale-95"
            style={{
              background: `var(--${mapTone(c.color)}-soft)`,
              color: `var(--${mapTone(c.color)})`,
            }}
          >
            {c.label}
          </button>
        ))}
        <button
          onClick={onShare}
          className="ml-auto flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-[4px] text-[12px] font-medium"
          style={{ background: "var(--surface)", color: "var(--ink-2)", border: "1px solid var(--line)" }}
        >
          <Icon name="share" size={12} /> Share this range
        </button>
        <button onClick={onCancel} className="px-1.5 text-[12px]" style={{ color: "var(--ink-3)" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function SpeakerRepair({
  segment,
  currentSpeakerId,
  people,
  rosterIds,
  sameSpeakerSegmentIds,
  onFix,
  onClose,
}: {
  segment: Segment;
  currentSpeakerId: string;
  people: Map<string, Person>;
  rosterIds: string[];
  sameSpeakerSegmentIds: string[];
  onFix: (to: string, everywhere: boolean) => void;
  onClose: () => void;
}) {
  const [target, setTarget] = useState<string | null>(null);

  return (
    <div
      className="fade-up mt-1.5 mb-1 rounded-[var(--radius)] p-2.5"
      style={{ background: "var(--surface-2)", border: "1px solid var(--line-strong)" }}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-[12px] font-semibold" style={{ color: "var(--ink)" }}>
          Reassign this line
        </span>
        <span className="text-[11px] tnum" style={{ color: "var(--ink-faint)" }}>
          confidence {Math.round(segment.confidence * 100)}%
        </span>
        <button onClick={onClose} className="ml-auto" aria-label="Close" style={{ color: "var(--ink-3)" }}>
          <Icon name="close" size={13} />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {rosterIds
          .filter((id) => id !== currentSpeakerId)
          .map((id) => {
            const p = people.get(id);
            if (!p) return null;
            const picked = target === id;
            return (
              <button
                key={id}
                onClick={() => setTarget(id)}
                className="flex items-center gap-1.5 rounded-full py-[3px] pr-2.5 pl-[3px] text-[12px] font-medium"
                style={{
                  background: picked ? "var(--accent-soft)" : "var(--surface)",
                  color: picked ? "var(--accent-ink)" : "var(--ink-2)",
                  border: `1px solid ${picked ? "var(--accent-line)" : "var(--line)"}`,
                }}
              >
                <Avatar person={p} size={17} />
                {p.name.split(" ")[0]}
              </button>
            );
          })}
      </div>

      {target && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            onClick={() => onFix(target, false)}
            className="rounded-[var(--radius-sm)] px-2.5 py-[5px] text-[12px] font-medium"
            style={{ background: "var(--surface)", color: "var(--ink-2)", border: "1px solid var(--line)" }}
          >
            Just this line
          </button>
          {/* The whole point. One correction, not two hundred. */}
          <button
            onClick={() => onFix(target, true)}
            className="rounded-[var(--radius-sm)] px-2.5 py-[5px] text-[12px] font-semibold"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            Fix all {sameSpeakerSegmentIds.length} lines from this voice
          </button>
        </div>
      )}
    </div>
  );
}
