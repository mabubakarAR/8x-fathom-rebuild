"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { clock, duration, when } from "@/lib/format";
import type {
  ActionItem,
  Chapter,
  Meeting,
  Person,
  Segment,
  Summary,
} from "@/lib/types";
import { Avatar, Badge, Icon, speakerVar } from "./ui";

interface Props {
  meeting: Meeting;
  segments: Segment[];
  chapters: Chapter[];
  summary: Summary | null;
  actionItems: ActionItem[];
  people: Person[];
  startMs: number;
  endMs: number;
  isClip: boolean;
  clipTitle: string | null;
  sharedBy: string | null;
  scope: string;
}

export function ShareView({
  meeting,
  segments,
  chapters,
  summary,
  actionItems,
  people,
  startMs,
  endMs,
  isClip,
  clipTitle,
  sharedBy,
}: Props) {
  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const [currentMs, setCurrentMs] = useState(startMs);
  const [playing, setPlaying] = useState(false);
  const raf = useRef<number | null>(null);
  const last = useRef(0);
  const activeRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!playing) return;
    last.current = performance.now();
    const tick = (now: number) => {
      const dt = now - last.current;
      last.current = now;
      setCurrentMs((ms) => {
        const next = ms + dt;
        if (next >= endMs) {
          setPlaying(false);
          return endMs;
        }
        return next;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [playing, endMs]);

  const active = segments.find((s) => currentMs >= s.startMs && currentMs <= s.endMs);

  useEffect(() => {
    if (playing && activeRef.current)
      activeRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [active?.id, playing]);

  const span = endMs - startMs;
  const pos = span ? (currentMs - startMs) / span : 0;
  const speakers = [...new Set(segments.map((s) => s.speakerId))]
    .map((id) => peopleById.get(id))
    .filter(Boolean) as Person[];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Its own chrome — no workspace nav for someone who isn't in the workspace. */}
      <header
        className="sticky top-0 z-20 backdrop-blur"
        style={{
          background: "color-mix(in oklab, var(--bg) 86%, transparent)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div className="mx-auto flex w-full max-w-[920px] items-center gap-2.5 px-4 py-3">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
            <circle cx="12" cy="12" r="2.4" fill="var(--accent)" />
            <circle cx="12" cy="12" r="6" fill="none" stroke="var(--accent)" strokeWidth="1.7" opacity=".6" />
            <circle cx="12" cy="12" r="10" fill="none" stroke="var(--accent)" strokeWidth="1.7" opacity=".26" />
          </svg>
          <span className="text-[14px] font-semibold tracking-tight">Verbatim</span>
          <Badge tone="accent">{isClip ? "Shared clip" : "Shared recording"}</Badge>
          <Link
            href="/"
            className="ml-auto text-[12.5px] font-medium"
            style={{ color: "var(--ink-3)" }}
          >
            What is this? <Icon name="external" size={12} />
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[920px] px-4 pb-20">
        <div className="pt-7 pb-4">
          <h1
            className="text-[22px] leading-tight font-semibold tracking-[-0.02em]"
            style={{ color: "var(--ink)" }}
          >
            {isClip && clipTitle ? clipTitle : meeting.title}
          </h1>
          <div
            className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px]"
            style={{ color: "var(--ink-3)" }}
          >
            {isClip && <span className="truncate">from {meeting.title}</span>}
            {isClip && <span aria-hidden>·</span>}
            <span className="tnum">{when(meeting.startedAt)}</span>
            <span aria-hidden>·</span>
            <span className="tnum">
              {isClip ? `${Math.round(span / 1000)}s clip` : duration(meeting.durationMs)}
            </span>
            {sharedBy && (
              <>
                <span aria-hidden>·</span>
                <span>shared by {sharedBy}</span>
              </>
            )}
          </div>
        </div>

        {/* player */}
        <div
          className="mb-4 rounded-[var(--radius-lg)] p-4"
          style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}
        >
          <div className="mb-3 flex flex-wrap gap-2">
            {speakers.map((p) => {
              const isActive = active?.speakerId === p.id;
              return (
                <span
                  key={p.id}
                  className="flex items-center gap-2 rounded-[var(--radius)] px-2.5 py-1.5"
                  style={{
                    background: isActive ? "var(--surface-2)" : "transparent",
                    border: `1px solid ${isActive ? speakerVar(p.hue) : "var(--line)"}`,
                  }}
                >
                  <Avatar person={p} size={22} />
                  <span className="text-[12.5px] font-medium">{p.name}</span>
                  {p.external && (
                    <span className="text-[10px]" style={{ color: "var(--violet)" }}>
                      external
                    </span>
                  )}
                </span>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (currentMs >= endMs - 50) setCurrentMs(startMs);
                setPlaying((p) => !p);
              }}
              aria-label={playing ? "Pause" : "Play"}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              <Icon name={playing ? "pause" : "play"} size={15} />
            </button>
            <span className="text-[12.5px] font-medium tnum" style={{ color: "var(--ink-2)" }}>
              {clock(currentMs - startMs)}
              <span style={{ color: "var(--ink-faint)" }}> / {clock(span)}</span>
            </span>
            <div
              className="relative h-[7px] flex-1 cursor-pointer rounded-full"
              style={{ background: "var(--surface-hover)" }}
              onPointerDown={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                const p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
                setCurrentMs(startMs + p * span);
              }}
            >
              <span
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${pos * 100}%`, background: "var(--accent)" }}
              />
            </div>
          </div>

          <p className="mt-2.5 text-[11px]" style={{ color: "var(--ink-faint)" }}>
            Capture is simulated in this rebuild — playback runs the transcript against a clock
            rather than media.
          </p>
        </div>

        {/* summary, whole-recording links only */}
        {summary && (
          <div
            className="mb-4 rounded-[var(--radius-lg)] p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
          >
            <h2 className="mb-2.5 text-[14px] font-semibold">Summary</h2>
            {summary.sections.map((sec) => (
              <section key={sec.id} className="mb-3">
                <h3 className="mb-1 text-[12.5px] font-semibold" style={{ color: "var(--ink-2)" }}>
                  {sec.heading}
                </h3>
                <ul className="flex flex-col gap-1">
                  {sec.bullets.map((b) => (
                    <li key={b.id}>
                      <button
                        onClick={() => {
                          setCurrentMs(b.anchorMs);
                          setPlaying(true);
                        }}
                        className="flex gap-2 text-left text-[13px] leading-[1.55]"
                        style={{ color: "var(--ink-2)" }}
                      >
                        <span className="shrink-0 tnum" style={{ color: "var(--accent-ink)" }}>
                          {clock(b.anchorMs)}
                        </span>
                        <span>{b.text}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        {actionItems.length > 0 && (
          <div
            className="mb-4 rounded-[var(--radius-lg)] p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
          >
            <h2 className="mb-2 text-[14px] font-semibold">Action items</h2>
            <ul className="flex flex-col gap-1.5">
              {actionItems.map((a) => {
                const who = a.assigneeId ? peopleById.get(a.assigneeId) : undefined;
                return (
                  <li key={a.id} className="flex items-start gap-2 text-[13px]" style={{ color: "var(--ink-2)" }}>
                    <span
                      className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: a.done ? "var(--ok)" : "var(--ink-faint)" }}
                    />
                    <span>
                      {a.text}
                      {who && (
                        <span style={{ color: "var(--ink-faint)" }}> — {who.name}</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* transcript */}
        <div
          className="rounded-[var(--radius-lg)] p-4"
          style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
        >
          <h2 className="mb-2.5 text-[14px] font-semibold">
            Transcript
            {isClip && (
              <span className="ml-2 text-[12px] font-normal" style={{ color: "var(--ink-faint)" }}>
                just this clip
              </span>
            )}
          </h2>
          <ul className="flex flex-col">
            {segments.map((s, i) => {
              const p = peopleById.get(s.speakerId);
              const isActive = s.id === active?.id;
              const newSpeaker = i === 0 || segments[i - 1].speakerId !== s.speakerId;
              const chapter = chapters.find((c) => c.startMs === s.startMs);
              return (
                <li key={s.id} ref={isActive ? activeRef : undefined}>
                  {chapter && (
                    <h3
                      className="mt-3 mb-1.5 text-[12.5px] font-semibold"
                      style={{ color: "var(--ink)" }}
                    >
                      {chapter.title}
                    </h3>
                  )}
                  <div
                    className="flex gap-2.5 rounded-[var(--radius-sm)] px-1.5 py-[3px]"
                    style={{ background: isActive ? "var(--accent-soft)" : undefined }}
                  >
                    <button
                      onClick={() => {
                        setCurrentMs(s.startMs);
                        setPlaying(true);
                      }}
                      className="w-[44px] shrink-0 pt-[3px] text-left text-[11px] tnum"
                      style={{ color: isActive ? "var(--accent-ink)" : "var(--ink-faint)" }}
                    >
                      {clock(s.startMs)}
                    </button>
                    <div className="min-w-0 flex-1">
                      {newSpeaker && p && (
                        <div
                          className="mt-1 mb-0.5 text-[12.5px] font-semibold"
                          style={{ color: speakerVar(p.hue) }}
                        >
                          {p.name}
                        </div>
                      )}
                      <p className="text-[13.5px] leading-[1.62]" style={{ color: "var(--ink-2)" }}>
                        {s.text}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="mt-5 text-center text-[12px]" style={{ color: "var(--ink-faint)" }}>
          Shared from Verbatim.{" "}
          <Link href="/" className="underline" style={{ color: "var(--accent-ink)" }}>
            Open the workspace
          </Link>
        </p>
      </main>
    </div>
  );
}
