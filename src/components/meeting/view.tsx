"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOverlay } from "@/lib/overlay";
import { duration, when } from "@/lib/format";
import type {
  ActionItem,
  Chapter,
  Highlight,
  HighlightCategory,
  Meeting,
  Person,
  Segment,
  Summary,
  Template,
} from "@/lib/types";
import { Badge, Icon } from "../ui";
import type { EvidenceLedger } from "@/lib/evidence";
import { Player } from "./player";
import { Transcript } from "./transcript";
import { SummaryPane } from "./summary";
import { HighlightsPane } from "./highlights";
import { ActionsPane } from "./actions";
import { AskPane } from "./ask";
import { EvidencePane } from "./evidence";
import { ShareDialog } from "./share";
import { ExportMenu } from "./export";

export interface MeetingViewProps {
  meeting: Meeting;
  segments: Segment[];
  chapters: Chapter[];
  summaries: Summary[];
  actionItems: ActionItem[];
  highlights: Highlight[];
  people: Person[];
  rosterIds: string[];
  categories: HighlightCategory[];
  templates: Template[];
  suggested: string[];
  /** Present for uploaded meetings: the real recording in Supabase Storage. */
  mediaUrl?: string | null;
  /** True when this meeting came out of the pipeline rather than the seed. */
  isLive?: boolean;
  /** Raw segments for the grounded Ask call, when they differ from `segments`. */
  askSegments?: { speakerLabel: number; startMs: number; endMs: number; text: string; confidence: number }[];
  askSpeakerNames?: Record<string, string>;
  /** Validation telemetry from the real pipeline. Absent for seeded meetings. */
  evidence?: EvidenceLedger;
}

type Tab = "summary" | "ask" | "evidence" | "highlights" | "actions";

export function MeetingView(props: MeetingViewProps) {
  const { meeting, segments, chapters, people } = props;
  const overlay = useOverlay();

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  // ---- playback clock ----------------------------------------------------
  // There is no media element: capture is stubbed, so the "recording" is a
  // clock advancing over the transcript's own timeline. Everything downstream
  // — active line, chapter, scrubber, waveform — reads from currentMs, exactly
  // as it would if a <video> were driving it. Swapping in a real element means
  // replacing this hook and nothing else.
  const [currentMs, setCurrentMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const raf = useRef<number | null>(null);
  const last = useRef<number>(0);

  // Real media when we have it, the clock when we don't.
  //
  // An uploaded meeting has an actual audio file, so the <audio> element is
  // the source of truth for currentMs and everything downstream — transcript,
  // chapters, scrubber — syncs against real playback. Seeded meetings have no
  // media, so the requestAnimationFrame clock stands in. Nothing else in the
  // component knows the difference.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasMedia = Boolean(props.mediaUrl);

  useEffect(() => {
    const el = audioRef.current;
    if (!hasMedia || !el) return;
    const onTime = () => setCurrentMs(el.currentTime * 1000);
    const onEnd = () => setPlaying(false);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnd);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnd);
    };
  }, [hasMedia]);

  useEffect(() => {
    const el = audioRef.current;
    if (!hasMedia || !el) return;
    el.playbackRate = rate;
    if (playing) void el.play().catch(() => setPlaying(false));
    else el.pause();
  }, [playing, rate, hasMedia]);

  useEffect(() => {
    if (hasMedia) return;
    if (!playing) {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
      return;
    }
    last.current = performance.now();
    const tick = (now: number) => {
      const dt = (now - last.current) * rate;
      last.current = now;
      setCurrentMs((ms) => {
        const next = ms + dt;
        if (next >= meeting.durationMs) {
          setPlaying(false);
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
  }, [playing, rate, meeting.durationMs, hasMedia]);

  // Auto-scroll follows playback until the user scrolls away, then stops and
  // offers to resume. Nothing is more annoying than a transcript that yanks
  // you back while you are reading.
  const [follow, setFollow] = useState(true);

  const seek = useCallback(
    (ms: number, opts?: { play?: boolean }) => {
      const clamped = Math.max(0, Math.min(meeting.durationMs, ms));
      setCurrentMs(clamped);
      if (audioRef.current) audioRef.current.currentTime = clamped / 1000;
      if (opts?.play) setPlaying(true);
      setFollow(true);
    },
    [meeting.durationMs],
  );

  // Deep link from search: /m/<id>?t=<ms> lands on the exact moment. A search
  // result that drops you at 0:00 is not a search result.
  //
  // Read straight off location rather than useSearchParams() — the hook forces
  // the whole page under a Suspense boundary and opts it out of static
  // prerendering, which is a lot of machinery for one optional number.
  const jumped = useRef(false);
  useEffect(() => {
    if (jumped.current) return;
    jumped.current = true;
    const t = Number(new URLSearchParams(window.location.search).get("t"));
    if (Number.isFinite(t) && t > 0) setCurrentMs(Math.min(t, meeting.durationMs));
  }, [meeting.durationMs]);

  const activeSegment = useMemo(() => {
    let lo = 0;
    let hi = segments.length - 1;
    let found: Segment | null = null;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const s = segments[mid];
      if (currentMs < s.startMs) hi = mid - 1;
      else if (currentMs > s.endMs) {
        found = s;
        lo = mid + 1;
      } else return s;
    }
    return found;
  }, [segments, currentMs]);

  const activeChapter = useMemo(
    () => chapters.find((c) => currentMs >= c.startMs && currentMs <= c.endMs) ?? chapters[0],
    [chapters, currentMs],
  );

  // ---- merged highlights (seed + viewer's own) ---------------------------
  const highlights = useMemo(() => {
    const removed = new Set(overlay.state.removedHighlightIds);
    return [
      ...props.highlights.filter((h) => !removed.has(h.id)),
      ...overlay.state.addedHighlights.filter((h) => h.meetingId === meeting.id),
    ].sort((a, b) => a.startMs - b.startMs);
  }, [props.highlights, overlay.state.removedHighlightIds, overlay.state.addedHighlights, meeting.id]);

  const [tab, setTab] = useState<Tab>("summary");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareRange, setShareRange] = useState<{ startMs: number; endMs: number; title: string } | null>(null);

  const openShare = useCallback((range?: { startMs: number; endMs: number; title: string }) => {
    setShareRange(range ?? null);
    setShareOpen(true);
  }, []);

  // ---- keyboard ----------------------------------------------------------
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      if (el instanceof HTMLElement && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable))
        return;
      if (e.metaKey || e.ctrlKey) return;
      if (e.key === " " || e.key === "k") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "ArrowLeft" || e.key === "j") {
        e.preventDefault();
        seek(currentMs - (e.shiftKey ? 30000 : 10000));
      } else if (e.key === "ArrowRight" || e.key === "l") {
        e.preventDefault();
        seek(currentMs + (e.shiftKey ? 30000 : 10000));
      } else if (e.key === "[") {
        e.preventDefault();
        const prev = [...chapters].reverse().find((c) => c.startMs < currentMs - 1500);
        if (prev) seek(prev.startMs);
      } else if (e.key === "]") {
        e.preventDefault();
        const next = chapters.find((c) => c.startMs > currentMs + 200);
        if (next) seek(next.startMs);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentMs, chapters, seek]);

  const speakers = useMemo(
    () =>
      meeting.participants
        .map((p) => ({ part: p, person: peopleById.get(p.personId)! }))
        .filter((x) => x.person)
        .sort((a, b) => b.part.talkMs - a.part.talkMs),
    [meeting.participants, peopleById],
  );

  const openActions = props.actionItems.filter(
    (a) => !(overlay.state.actionsDone[a.id] ?? a.done),
  ).length;

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "summary", label: "Summary" },
    { key: "ask", label: "Ask" },
    // Only meetings that went through the model have a ledger to show. A
    // seeded meeting showing "0 dropped" would be a lie of omission: nothing
    // was validated because nothing was generated.
    ...(props.evidence ? [{ key: "evidence" as Tab, label: "Evidence" }] : []),
    { key: "highlights", label: "Clips", count: highlights.length },
    { key: "actions", label: "Actions", count: openActions },
  ];

  return (
    <div className="mx-auto w-full max-w-[1480px] px-4 pb-12 md:px-7">
      {/* ---- header ---- */}
      <header className="pt-6 pb-4 md:pt-8">
        <Link
          href="/"
          className="mb-2.5 inline-flex items-center gap-1.5 text-[12.5px] font-medium"
          style={{ color: "var(--ink-3)" }}
        >
          <Icon name="back" size={14} /> All meetings
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1
              className="text-[21px] leading-tight font-semibold tracking-[-0.02em]"
              style={{ color: "var(--ink)" }}
            >
              {meeting.title}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px]" style={{ color: "var(--ink-3)" }}>
              {props.isLive && (
                <Badge tone="ok" title="Structure below was generated by a model reading this transcript, with every citation validated">
                  {hasMedia ? "Real recording" : "Real analysis"}
                </Badge>
              )}
              <span className="tnum">{when(meeting.startedAt)}</span>
              <span aria-hidden>·</span>
              <span className="tnum">{duration(meeting.durationMs)}</span>
              <span aria-hidden>·</span>
              <span className="capitalize">{meeting.platform}</span>
              <span aria-hidden>·</span>
              <span>{meeting.participants.length} invited</span>
              {meeting.hasExternal && <Badge tone="violet">External guests</Badge>}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* The trust chip.
                The evidence ledger was living behind a tab, which is the wrong
                place for the one fact that distinguishes this product from
                every other notetaker. It belongs next to the title, where you
                cannot read the summary without having already seen it. */}
            {props.evidence && (
              <button
                onClick={() => setTab("evidence")}
                title="How many of the model's claims resolved to a real transcript line"
                className="hidden items-center gap-2 rounded-full py-[5px] pr-3 pl-2 text-[12px] font-medium transition-colors sm:inline-flex"
                style={{
                  background: props.evidence.dropped.length ? "var(--warn-soft)" : "var(--ok-soft)",
                  color: "var(--ink-2)",
                  border: "1px solid var(--line)",
                }}
              >
                <span
                  style={{ color: props.evidence.dropped.length ? "var(--warn-ink)" : "var(--ok-ink)" }}
                >
                  <Icon name="shield" size={13} />
                </span>
                <span className="tnum">
                  <strong
                    style={{ color: props.evidence.dropped.length ? "var(--warn-ink)" : "var(--ok-ink)" }}
                  >
                    {props.evidence.resolved}/{props.evidence.proposed}
                  </strong>{" "}
                  claims verified
                  {props.evidence.dropped.length > 0 && (
                    <> · <strong style={{ color: "var(--warn-ink)" }}>{props.evidence.dropped.length}</strong> cut</>
                  )}
                </span>
              </button>
            )}
            <ExportMenu {...props} highlights={highlights} />
            <button
              onClick={() => openShare()}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-[7px] text-[13px] font-medium"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              <Icon name="share" size={14} /> Share
            </button>
          </div>
        </div>
      </header>

      {props.mediaUrl && (
        <audio ref={audioRef} src={props.mediaUrl} preload="metadata" className="hidden" />
      )}

      {/* ---- body: transcript centre, rail right ---- */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_396px] xl:grid-cols-[minmax(0,1fr)_432px]">
        <div className="min-w-0">
          <Player
            meeting={meeting}
            chapters={chapters}
            highlights={highlights}
            segments={segments}
            people={peopleById}
            currentMs={currentMs}
            playing={playing}
            rate={rate}
            activeSegment={activeSegment}
            activeChapter={activeChapter}
            onSeek={seek}
            onTogglePlay={() => setPlaying((p) => !p)}
            onRate={setRate}
            isLive={props.isLive}
            hasMedia={hasMedia}
          />

          <Transcript
            meetingId={meeting.id}
            segments={segments}
            chapters={chapters}
            people={peopleById}
            rosterIds={props.rosterIds}
            categories={props.categories}
            currentMs={currentMs}
            activeSegmentId={activeSegment?.id ?? null}
            follow={follow}
            onFollowChange={setFollow}
            onSeek={seek}
            onShareRange={openShare}
          />
        </div>

        {/* ---- right rail ---- */}
        <aside className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
          <div
            className="flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)]"
            style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}
          >
            <div
              role="tablist"
              aria-label="Meeting detail"
              className="flex shrink-0 gap-0.5 p-1.5"
              style={{ borderBottom: "1px solid var(--line)" }}
            >
              {TABS.map((t) => (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={tab === t.key}
                  onClick={() => setTab(t.key)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-[7px] px-2 py-[7px] text-[13px] font-medium transition-colors"
                  style={{
                    background: tab === t.key ? "var(--surface-2)" : "transparent",
                    color: tab === t.key ? "var(--ink)" : "var(--ink-3)",
                  }}
                >
                  {t.label}
                  {t.count != null && t.count > 0 && (
                    <span
                      className="rounded-full px-1.5 text-[10.5px] font-semibold tnum"
                      style={{
                        background: tab === t.key ? "var(--accent-soft)" : "var(--surface-2)",
                        color: tab === t.key ? "var(--accent-ink)" : "var(--ink-faint)",
                      }}
                    >
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
              {tab === "summary" && (
                <SummaryPane
                  meeting={meeting}
                  summaries={props.summaries}
                  templates={props.templates}
                  suggested={props.suggested}
                  people={peopleById}
                  currentMs={currentMs}
                  onSeek={seek}
                  speakers={speakers}
                  segments={segments}
                />
              )}
              {tab === "evidence" && props.evidence && (
                <EvidencePane ledger={props.evidence} />
              )}
              {tab === "ask" && (
                <AskPane
                  meeting={meeting}
                  segments={segments}
                  summaries={props.summaries}
                  people={peopleById}
                  onSeek={seek}
                  askSegments={props.askSegments}
                  askSpeakerNames={props.askSpeakerNames}
                />
              )}
              {tab === "highlights" && (
                <HighlightsPane
                  meetingId={meeting.id}
                  highlights={highlights}
                  categories={props.categories}
                  people={peopleById}
                  currentMs={currentMs}
                  onSeek={seek}
                  onShare={openShare}
                />
              )}
              {tab === "actions" && (
                <ActionsPane
                  meetingId={meeting.id}
                  items={props.actionItems}
                  people={peopleById}
                  rosterIds={props.rosterIds}
                  currentMs={currentMs}
                  onSeek={seek}
                />
              )}
            </div>
          </div>
        </aside>
      </div>

      {shareOpen && (
        <ShareDialog
          meeting={meeting}
          range={shareRange}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}
