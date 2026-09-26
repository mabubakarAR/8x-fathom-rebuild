"use client";

import { useEffect, useState } from "react";

const LOOP = 17;
const TICK = 100;

const SPEAKERS = [
  { name: "Priya R.", color: "var(--sp-0)" },
  { name: "Rachel M.", color: "var(--sp-1)" },
  { name: "Ayesha K.", color: "var(--sp-2)" },
  { name: "Dani O.", color: "var(--sp-3)" },
  { name: "Marcus T.", color: "var(--sp-4)" },
  { name: "Jon L.", color: "var(--sp-5)" },
  { name: "Leah O.", color: "var(--sp-6)" },
  { name: "Sam W.", color: "var(--sp-7)" },
];

const SEGMENTS = [
  { s: 0, start: 0, end: 2.2, text: "Okay — we need to lock Q4 today. Search is the open question." },
  { s: 1, start: 2.2, end: 4.4, text: "The shadow index needs four weeks of running before we decide." },
  { s: 2, start: 4.4, end: 6.4, text: "Then search slips to late January, after Brightwater renews." },
  { s: 3, start: 6.4, end: 8, text: "Can we still ship the ranking fix before that? It's small." },
  { s: 4, start: 8, end: 10, text: "Yes, if I own the rollback plan. I'll have it by Wednesday." },
  { s: 5, start: 10, end: 11.6, text: "Brightwater asked about SSO twice last week, by the way." },
  { s: 6, start: 11.6, end: 13.6, text: "Then SSO moves up. I'll draft the scope doc." },
  { s: 7, start: 13.6, end: 16, text: "So — search in January, ranking fix now, SSO scoped by Friday." },
];

const NOTES = [
  { at: 6.4, kind: "Decision", text: "Search slips to late January, after Brightwater's renewal.", s: 2, ts: "43:17" },
  { at: 10, kind: "Action", text: "Marcus owns the rollback plan — due Wednesday.", s: 4, ts: "44:02" },
  { at: 13.6, kind: "Signal", text: "Brightwater raised SSO twice; Leah is scoping it.", s: 5, ts: "44:31" },
];

const CHAPTERS = [
  { label: "Intro", w: 12 },
  { label: "Search timeline", w: 30 },
  { label: "Ranking fix", w: 22 },
  { label: "SSO", w: 20 },
  { label: "Wrap-up", w: 16 },
];

function clock(t: number) {
  const secs = 43 * 60 + Math.floor(t * 5);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `00:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function HeroDemo() {
  const [t, setT] = useState(0);

  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = window.setInterval(() => setT((x) => (still ? LOOP - 0.2 : (x + TICK / 1000) % LOOP)), TICK);
    return () => window.clearInterval(id);
  }, []);

  const activeIdx = SEGMENTS.findIndex((seg) => t >= seg.start && t < seg.end);
  const active = activeIdx >= 0 ? SEGMENTS[activeIdx] : null;
  const pct = (Math.min(t, 16) / 16) * 100;
  const done = NOTES.every((n) => t >= n.at) && t >= 16;

  return (
    <div className="lp-window overflow-hidden text-left" role="img" aria-label="A simulated eight-person meeting being transcribed into cited notes in real time">
      <div className="flex items-center gap-3 border-b px-4 py-3 md:px-5" style={{ borderColor: "var(--line)" }}>
        <div className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "oklch(100% 0 0 / 0.12)" }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "oklch(100% 0 0 / 0.12)" }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "oklch(100% 0 0 / 0.12)" }} />
        </div>
        <div className="min-w-0 flex-1 truncate text-[12.5px] font-medium" style={{ color: "var(--ink-2)" }}>
          Q4 Roadmap Lock <span style={{ color: "var(--ink-faint)" }}>· 8 speakers · Google Meet</span>
        </div>
        <div className="flex items-center gap-2 rounded-full px-2.5 py-1 text-[11.5px] font-semibold tnum" style={{ background: "oklch(68% 0.2 25 / 0.14)", color: "oklch(80% 0.14 25)" }}>
          <span className="lp-rec h-1.5 w-1.5 rounded-full" style={{ background: "var(--danger)" }} />
          REC {clock(t)}
        </div>
      </div>

      <div className="grid md:grid-cols-[1.3fr_1fr]">
        <div className="border-b p-4 md:border-r md:border-b-0 md:p-5" style={{ borderColor: "var(--line)" }}>
          <div className="mb-3 flex items-center justify-between text-[10.5px] font-semibold tracking-[0.14em] uppercase" style={{ color: "var(--ink-faint)" }}>
            <span>The room</span>
            <span className="normal-case tracking-normal font-medium">each voice, its own lane</span>
          </div>
          <div className="flex flex-col gap-[7px]">
            {SPEAKERS.map((sp, i) => {
              const speaking = active?.s === i;
              return (
                <div key={sp.name} className="flex items-center gap-2.5">
                  <div className="flex w-[84px] shrink-0 items-center gap-2 md:w-[96px]">
                    <span
                      className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9.5px] font-bold transition-transform duration-300"
                      style={{ background: sp.color, color: "oklch(18% 0.02 245)", transform: speaking ? "scale(1.15)" : "none", boxShadow: speaking ? `0 0 14px ${sp.color}` : "none" }}
                    >
                      {sp.name[0]}
                    </span>
                    <span className="truncate text-[11.5px] transition-colors" style={{ color: speaking ? "var(--ink)" : "var(--ink-3)" }}>{sp.name}</span>
                  </div>
                  <div className="relative h-[18px] flex-1 overflow-hidden rounded-[5px]" style={{ background: "oklch(100% 0 0 / 0.035)" }}>
                    {SEGMENTS.filter((seg) => seg.s === i).map((seg) => {
                      const left = (seg.start / 16) * 100;
                      const full = ((seg.end - seg.start) / 16) * 100;
                      const heard = Math.max(0, Math.min(full, pct - left));
                      return (
                        <span key={seg.start} className="absolute inset-y-[3px] rounded-[3px]" style={{ left: `${left}%`, width: `${heard}%`, background: sp.color, opacity: speaking ? 1 : 0.55, boxShadow: speaking ? `0 0 12px ${sp.color}` : "none" }} />
                      );
                    })}
                    <span className="absolute inset-y-0 w-px" style={{ left: `${pct}%`, background: "oklch(100% 0 0 / 0.55)" }} />
                  </div>
                  <span className="lp-bars flex h-4 w-[18px] items-center gap-[2px]" style={{ color: sp.color, opacity: speaking ? 1 : 0 }} aria-hidden>
                    <span style={{ height: "100%", animationDelay: "0s" }} />
                    <span style={{ height: "70%", animationDelay: ".15s" }} />
                    <span style={{ height: "90%", animationDelay: ".3s" }} />
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 min-h-[62px] rounded-[12px] px-3.5 py-2.5" style={{ background: "oklch(100% 0 0 / 0.035)", border: "1px solid var(--line)" }}>
            {active ? (
              <p key={activeIdx} className="lp-caption text-[13px] leading-[1.5]" style={{ color: "var(--ink-2)" }}>
                <span className="font-semibold" style={{ color: SPEAKERS[active.s].color }}>{SPEAKERS[active.s].name} </span>
                {active.text}
              </p>
            ) : (
              <p className="text-[13px]" style={{ color: "var(--ink-faint)" }}>Writing the summary&hellip;</p>
            )}
          </div>
        </div>

        <div className="flex flex-col p-4 md:p-5">
          <div className="mb-3 flex items-center gap-2 text-[10.5px] font-semibold tracking-[0.14em] uppercase" style={{ color: "var(--ink-faint)" }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
            Notes, forming
          </div>
          <div className="flex flex-1 flex-col gap-2.5">
            {NOTES.map((n) =>
              t >= n.at ? (
                <div key={n.text} className="lp-crystal rounded-[12px] p-3" style={{ background: "oklch(100% 0 0 / 0.04)", border: "1px solid var(--line)" }}>
                  <div className="mb-1 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: "var(--accent)" }}>{n.kind}</div>
                  <p className="text-[13px] leading-[1.45]" style={{ color: "var(--ink)" }}>{n.text}</p>
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-[3px] text-[10.5px] font-semibold tnum" style={{ background: "oklch(100% 0 0 / 0.05)", color: "var(--ink-2)" }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: SPEAKERS[n.s].color }} />
                    {n.ts} · {SPEAKERS[n.s].name}
                  </div>
                </div>
              ) : (
                <div key={n.text} className="rounded-[12px] p-3" style={{ border: "1px dashed var(--line)" }} aria-hidden>
                  <div className="lp-skeleton mb-2 h-2 w-14 rounded" />
                  <div className="lp-skeleton mb-1.5 h-2.5 w-full rounded" />
                  <div className="lp-skeleton h-2.5 w-2/3 rounded" />
                </div>
              ),
            )}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11.5px] font-medium transition-opacity duration-500" style={{ color: "var(--ok)", opacity: done ? 1 : 0 }}>
            <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            3 of 3 claims anchored to the transcript
          </div>
        </div>
      </div>

      <div className="border-t px-4 py-3 md:px-5" style={{ borderColor: "var(--line)" }}>
        <div className="relative flex h-1.5 gap-[3px]">
          {CHAPTERS.map((c, i) => (
            <span key={c.label} className="h-full rounded-full" style={{ width: `${c.w}%`, background: i === 1 ? "var(--accent)" : "oklch(100% 0 0 / 0.12)" }} />
          ))}
        </div>
        <div className="mt-2 hidden gap-[3px] text-[10.5px] sm:flex" style={{ color: "var(--ink-faint)" }}>
          {CHAPTERS.map((c, i) => (
            <span key={c.label} className="truncate" style={{ width: `${c.w}%`, color: i === 1 ? "var(--accent-ink)" : undefined }}>{c.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
