"use client";

import { useEffect, useRef, useState } from "react";

const STEPS = [
  {
    verb: "Record",
    title: "Share the tab. That's the whole setup.",
    body: "Zoom, Meet or Teams in any browser tab. No bot joins, nothing is installed, and the share dialog is the consent step.",
    visual: <RecordVisual />,
  },
  {
    verb: "Transcribe",
    title: "Eight voices, kept apart.",
    body: "Every speaker gets a lane and a colour. When people talk over each other it's flagged — not quietly guessed.",
    visual: <TranscribeVisual />,
  },
  {
    verb: "Chapter",
    title: "An hour becomes a table of contents.",
    body: "Topics are found for you and pinned to the scrubber. Jump straight to the bit about pricing.",
    visual: <ChapterVisual />,
  },
  {
    verb: "Cite",
    title: "Every claim shows its source.",
    body: "Each line of the summary is checked against the transcript before you see it. Anything that can't be verified is dropped — and named.",
    visual: <CiteVisual />,
  },
  {
    verb: "Ask",
    title: "Question your whole history.",
    body: "Ask across every meeting you've had. The answer comes back with the call, the speaker and the second it was said.",
    visual: <AskVisual />,
  },
];

export function Depth() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="grid gap-10 md:grid-cols-[260px_1fr] md:gap-16">
      <aside className="hidden md:block">
        <div className="sticky top-[22vh]">
          <div className="text-[11px] font-semibold tracking-[0.16em] uppercase" style={{ color: "var(--ink-faint)" }}>Depth</div>
          <div className="display mt-1 text-[88px] leading-none tnum" style={{ color: "var(--ink)" }}>
            {active}
            <span className="ml-2 align-top text-[22px] italic" style={{ color: "var(--accent)" }}>ftm</span>
          </div>
          <div className="mt-1 text-[12.5px] tnum" style={{ color: "var(--ink-3)" }}>{active * 6} ft below the surface</div>

          <ol className="relative mt-8 flex flex-col gap-5 pl-6">
            <span className="absolute top-1 bottom-1 left-[5px] w-px" style={{ background: "var(--line-strong)" }} aria-hidden />
            <span
              className="absolute left-[5px] top-1 w-px transition-all duration-700"
              style={{ height: `calc(${(active / (STEPS.length - 1)) * 100}% - 8px)`, background: "var(--accent)" }}
              aria-hidden
            />
            {STEPS.map((s, i) => (
              <li key={s.verb} className="relative flex items-center gap-3 text-[14px] transition-colors duration-500" style={{ color: i <= active ? "var(--ink)" : "var(--ink-faint)" }}>
                <span
                  className="absolute -left-6 top-1/2 h-[11px] w-[11px] -translate-y-1/2 rounded-full transition-all duration-500"
                  style={{ background: i <= active ? "var(--accent)" : "var(--bg)", border: `1px solid ${i <= active ? "var(--accent)" : "var(--line-strong)"}`, boxShadow: i === active ? "0 0 0 4px var(--accent-soft)" : "none" }}
                  aria-hidden
                />
                <span className="w-5 text-[11px] tnum" style={{ color: "var(--ink-faint)" }}>{i}</span>
                <span className={i === active ? "font-semibold" : ""}>{s.verb}</span>
              </li>
            ))}
          </ol>
        </div>
      </aside>

      <div className="flex flex-col gap-10 md:gap-0">
        {STEPS.map((s, i) => (
          <div
            key={s.verb}
            ref={(el) => {
              refs.current[i] = el;
            }}
            data-i={i}
            className="flex flex-col justify-center gap-6 md:min-h-[78vh] transition-opacity duration-700"
            style={{ opacity: i === active ? 1 : 0.35 }}
          >
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11.5px] font-semibold" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
                <span className="tnum">{i} ftm</span> · {s.verb}
              </div>
              <h3 className="display text-[34px] leading-[1.05] text-balance md:text-[48px]">{s.title}</h3>
              <p className="mt-3 max-w-[48ch] text-[15.5px] leading-[1.6]" style={{ color: "var(--ink-3)" }}>{s.body}</p>
            </div>
            <div className="lp-card max-w-[560px] p-5">{s.visual}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const sp = (n: number) => `var(--sp-${n})`;

function RecordVisual() {
  return (
    <div>
      <div className="flex items-center gap-3 rounded-[12px] px-3.5 py-3" style={{ background: "oklch(100% 0 0 / 0.04)", border: "1px solid var(--line)" }}>
        <span className="h-2 w-2 rounded-full lp-rec" style={{ background: "var(--danger)" }} />
        <span className="flex-1 truncate text-[13px]" style={{ color: "var(--ink-2)" }}>meet.google.com/qrt-lock-q4</span>
        <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: "var(--accent)", color: "var(--on-accent)" }}>Sharing tab audio</span>
      </div>
      <div className="mt-4 text-[11px] font-semibold tracking-[0.12em] uppercase" style={{ color: "var(--ink-faint)" }}>Participants · 8</div>
      <div className="mt-2 flex items-center">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
          <span key={n} className="-ml-1.5 grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold first:ml-0" style={{ background: sp(n), color: "oklch(18% 0.02 245)", border: "2px solid var(--surface)" }}>
            {"PRADMJLS"[n]}
          </span>
        ))}
        <span className="ml-3 text-[12.5px]" style={{ color: "var(--ink-3)" }}>
          No bot in the list. <span style={{ color: "var(--ok)" }}>Ever.</span>
        </span>
      </div>
    </div>
  );
}

function TranscribeVisual() {
  const lines = [
    { n: 1, who: "Rachel M.", t: "12:04", text: "The shadow index needs four weeks of running." },
    { n: 4, who: "Marcus T.", t: "12:09", text: "I can own the rollback—", cross: true },
    { n: 3, who: "Dani O.", t: "12:09", text: "—wait, before that, the ranking fix?", cross: true },
  ];
  return (
    <div className="flex flex-col gap-3">
      {lines.map((l) => (
        <div key={l.text} className="flex gap-3">
          <span className="mt-0.5 w-1 shrink-0 rounded-full" style={{ background: sp(l.n) }} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[12px]">
              <span className="font-semibold" style={{ color: sp(l.n) }}>{l.who}</span>
              <span className="tnum" style={{ color: "var(--ink-faint)" }}>{l.t}</span>
              {l.cross && (
                <span className="rounded px-1.5 py-px text-[10px] font-semibold" style={{ background: "oklch(82% 0.13 82 / 0.14)", color: "var(--warn)" }}>crosstalk</span>
              )}
            </div>
            <p className="text-[14px] leading-[1.5]" style={{ color: "var(--ink-2)" }}>{l.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChapterVisual() {
  const ch = [
    { l: "Intro", w: 10, t: "00:00" },
    { l: "Search timeline", w: 28, t: "06:12" },
    { l: "Ranking fix", w: 20, t: "21:40" },
    { l: "SSO", w: 24, t: "32:05" },
    { l: "Wrap-up", w: 18, t: "46:30" },
  ];
  return (
    <div>
      <div className="flex h-2.5 gap-1">
        {ch.map((c, i) => (
          <span key={c.l} className="h-full rounded-full" style={{ width: `${c.w}%`, background: i === 3 ? "var(--accent)" : "oklch(100% 0 0 / 0.12)" }} />
        ))}
      </div>
      <ul className="mt-4 flex flex-col">
        {ch.map((c, i) => (
          <li key={c.l} className="flex items-center justify-between border-t py-2 text-[13.5px] first:border-t-0" style={{ borderColor: "var(--line)", color: i === 3 ? "var(--ink)" : "var(--ink-3)" }}>
            <span className="flex items-center gap-2.5">
              <span className="tnum text-[11px]" style={{ color: "var(--ink-faint)" }}>0{i + 1}</span>
              {c.l}
            </span>
            <span className="tnum text-[12px]" style={{ color: i === 3 ? "var(--accent-ink)" : "var(--ink-faint)" }}>{c.t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CiteVisual() {
  return (
    <div>
      <p className="text-[14.5px] leading-[1.5]" style={{ color: "var(--ink)" }}>Search improvements slip to late January — after Brightwater&apos;s renewal.</p>
      <div className="mt-2 rounded-[10px] px-3 py-2 text-[12.5px] leading-[1.5]" style={{ background: "oklch(100% 0 0 / 0.04)", color: "var(--ink-2)", borderLeft: `2px solid ${sp(2)}` }}>
        <span className="font-semibold tnum" style={{ color: "var(--accent-ink)" }}>43:17</span>
        <span style={{ color: "var(--ink-3)" }}> · Ayesha K. — </span>
        &ldquo;Late January, honestly, if the decision goes yes.&rdquo;
      </div>
      <div className="mt-4 flex flex-col gap-1.5 text-[12px]">
        <span className="inline-flex items-center gap-1.5" style={{ color: "var(--ok)" }}>
          <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          29 claims anchored
        </span>
        <span className="line-through decoration-1" style={{ color: "var(--ink-faint)" }}>&ldquo;Pricing moves to annual-only.&rdquo;</span>
        <span style={{ color: "var(--warn)" }}>1 discarded — cited line 340, transcript ends at 332</span>
      </div>
    </div>
  );
}

function AskVisual() {
  return (
    <div>
      <div className="ml-auto w-fit max-w-[85%] rounded-[14px] rounded-br-[4px] px-3.5 py-2 text-[13.5px]" style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
        Did we ever reverse the SSO decision?
      </div>
      <div className="mt-3 rounded-[14px] rounded-bl-[4px] px-3.5 py-3 text-[13.5px] leading-[1.55]" style={{ background: "oklch(100% 0 0 / 0.04)", border: "1px solid var(--line)", color: "var(--ink-2)" }}>
        Once. SSO was deprioritised on <b style={{ color: "var(--ink)" }}>Oct 3</b>, then moved back up on <b style={{ color: "var(--ink)" }}>Oct 17</b> after Brightwater asked twice.
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {[
            { m: "Planning · Oct 3", t: "18:22", n: 0 },
            { m: "Q4 Lock · Oct 17", t: "44:31", n: 5 },
          ].map((c) => (
            <span key={c.m} className="inline-flex items-center gap-1.5 rounded-full px-2 py-[3px] text-[10.5px] font-semibold tnum" style={{ background: "oklch(100% 0 0 / 0.06)", color: "var(--ink-2)" }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: sp(c.n) }} />
              {c.m} · {c.t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
