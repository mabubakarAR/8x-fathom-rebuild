"use client";

import { useEffect, useMemo, useReducer } from "react";
import { Icon } from "./ui";

// The verification theatre.
//
// Everything else on this page can be described. This has to be *watched*,
// because the product's whole argument is a process: a model proposes a
// claim, the claim carries the index of the transcript line it came from, the
// server checks that index against the real array, and a claim that fails is
// deleted rather than repaired.
//
// A tab called "Evidence" describes that. This performs it, on a loop, with
// no click and no twenty-five-second wait — which is the difference between a
// reviewer understanding the product in one sight and understanding it after
// reading three paragraphs they were never going to read.
//
// Honesty, because the whole point is trust:
//   - The transcript lines are verbatim from samples/renewal-call.vtt.
//   - The kept claims are what claude-sonnet-4-5 actually returned for that
//     file, indices included. They are not written for the demo.
//   - The failing claim is synthetic — it cites line 31 of a 30-line
//     transcript, which is exactly the case scripts/test-validation.mjs
//     asserts on. The UI says so underneath rather than implying the model
//     hallucinated on this particular run.

interface Line {
  i: number;
  who: string;
  hue: number;
  text: string;
}

interface Claim {
  text: string;
  /** The index the model cited. */
  cite: number;
  /** Synthetic failure case, labelled as such in the UI. */
  synthetic?: boolean;
}

const LINES: Line[] = [
  { i: 1, who: "Helen", hue: 3, text: "We're not signing a three-year this time. The board pushed back hard on the multi-year commitment." },
  { i: 3, who: "Helen", hue: 3, text: "On the term. The pricing is fine. It's the lock-in. We've had two vendors go sideways on us in eighteen months." },
  { i: 4, who: "Priya", hue: 0, text: "So a one-year with the same rate, or a two-year with a break clause at twelve months?" },
  { i: 6, who: "Dani", hue: 1, text: "I can't sign off on unilateral without Legal. I can tell you today that the rate holds either way." },
  { i: 9, who: "Marcus", hue: 2, text: "The SSO migration. We said we'd do it before renewal. We have not done it before renewal." },
];

const CLAIMS: Claim[] = [
  { text: "Northwind rejected the three-year term; the objection is lock-in, not price", cite: 3 },
  { text: "Structure agreed: two-year with a unilateral twelve-month break clause", cite: 4 },
  { text: "Rate is unchanged either way — Legal still has to clear the break clause", cite: 6 },
  { text: "Annual contract value is $240,000 across both years", cite: 31, synthetic: true },
  { text: "SSO migration slipped past renewal and is now a separate Q1 project", cite: 9 },
];

const MAX_IDX = 29;

// One step of the loop. Kept as an explicit machine because "whatever
// setTimeout does" is how animations end up out of sync with their own copy.
type Phase = "reading" | "proposing" | "checking" | "settled" | "done";
interface State {
  n: number;      // how many claims have entered
  phase: Phase;
  tick: number;
}
type Action = { type: "advance" } | { type: "reset" };

const START: State = { n: 0, phase: "reading", tick: 0 };

function reducer(s: State, a: Action): State {
  if (a.type === "reset") return { ...START, tick: s.tick + 1 };
  switch (s.phase) {
    case "reading":
      return { ...s, phase: "proposing", n: s.n + 1 };
    case "proposing":
      return { ...s, phase: "checking" };
    case "checking":
      return { ...s, phase: "settled" };
    case "settled":
      return s.n >= CLAIMS.length ? { ...s, phase: "done" } : { ...s, phase: "reading" };
    case "done":
      return s;
  }
}

const DELAY: Record<Phase, number> = {
  reading: 260,
  proposing: 480,
  checking: 620,
  settled: 340,
  done: 2600,
};

export function Theatre() {
  const [s, dispatch] = useReducer(reducer, START);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return; // handled below by rendering the finished state
    }
    const t = setTimeout(
      () => dispatch(s.phase === "done" ? { type: "reset" } : { type: "advance" }),
      DELAY[s.phase],
    );
    return () => clearTimeout(t);
  }, [s.phase, s.n, s.tick]);

  const still = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const shown = still ? CLAIMS.length : s.n;
  const settledCount = still
    ? CLAIMS.length
    : s.phase === "settled" || s.phase === "done"
      ? s.n
      : s.n - 1;

  const kept = CLAIMS.slice(0, Math.max(0, settledCount)).filter((c) => c.cite <= MAX_IDX).length;
  const cut = CLAIMS.slice(0, Math.max(0, settledCount)).filter((c) => c.cite > MAX_IDX).length;
  const active = shown > 0 ? CLAIMS[shown - 1] : null;
  const scanning = !still && s.phase === "checking";

  return (
    <div
      className="overflow-hidden rounded-[var(--radius-lg)]"
      style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-lg)" }}
    >
      {/* ---- transcript ---- */}
      <div className="px-4 pt-3.5 pb-3" style={{ borderBottom: "1px solid var(--line)" }}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-semibold tracking-[0.09em] uppercase" style={{ color: "var(--ink-faint)" }}>
            Transcript · 30 numbered lines
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: "var(--accent)" }}>
            <Icon name="live" size={10} /> checking
          </span>
        </div>
        <ul className="flex flex-col gap-[3px]">
          {LINES.map((l) => {
            const lit = scanning && active?.cite === l.i;
            return (
              <li
                key={l.i}
                className="flex gap-2 rounded-[5px] px-1.5 py-[3px] text-[11.5px] leading-[1.45] transition-colors duration-200"
                style={{
                  background: lit ? "var(--accent-soft)" : "transparent",
                  color: lit ? "var(--ink)" : "var(--ink-3)",
                }}
              >
                <span className="shrink-0 tnum" style={{ color: lit ? "var(--accent-ink)" : "var(--ink-faint)" }}>
                  [{l.i}]
                </span>
                <span className="shrink-0 font-medium" style={{ color: `var(--sp-${l.hue})` }}>
                  {l.who}
                </span>
                <span className="line-clamp-1">{l.text}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ---- claims ---- */}
      <div className="px-4 pt-3 pb-3.5">
        <div className="mb-2 text-[10px] font-semibold tracking-[0.09em] uppercase" style={{ color: "var(--ink-faint)" }}>
          What the model claims
        </div>

        <ul className="flex min-h-[176px] flex-col gap-1.5">
          {CLAIMS.slice(0, shown).map((c, i) => {
            const isActive = i === shown - 1;
            const isSettled = i < settledCount;
            const bad = c.cite > MAX_IDX;
            const checking = isActive && scanning;
            const verdict: "pending" | "ok" | "cut" = !isSettled ? "pending" : bad ? "cut" : "ok";

            return (
              <li
                key={i}
                className="flex items-start gap-2 rounded-[7px] px-2 py-[7px] text-[12px] leading-[1.45] transition-all duration-300"
                style={{
                  background:
                    verdict === "cut" ? "var(--danger-soft)" : checking ? "var(--surface-2)" : "transparent",
                  border: `1px solid ${verdict === "cut" ? "color-mix(in oklab, var(--danger) 40%, transparent)" : "transparent"}`,
                  opacity: verdict === "cut" ? 0.72 : 1,
                  animation: isActive ? "claim-in .34s cubic-bezier(.16,1,.3,1) both" : undefined,
                }}
              >
                <span className="mt-[1px] shrink-0">
                  {verdict === "ok" && <span style={{ color: "var(--ok)" }}><Icon name="check" size={13} /></span>}
                  {verdict === "cut" && <span style={{ color: "var(--danger)" }}><Icon name="close" size={13} /></span>}
                  {verdict === "pending" && (
                    <span
                      className="block h-[11px] w-[11px] rounded-full"
                      style={{
                        border: "1.5px solid var(--accent)",
                        animation: checking ? "pulse-ring .62s ease-in-out infinite" : undefined,
                      }}
                    />
                  )}
                </span>

                <span
                  className="min-w-0 flex-1"
                  style={{
                    color: verdict === "cut" ? "var(--ink-3)" : "var(--ink-2)",
                    textDecoration: verdict === "cut" ? "line-through" : undefined,
                  }}
                >
                  {c.text}
                </span>

                <span
                  className="shrink-0 rounded-[4px] px-1.5 py-[1px] text-[10.5px] font-semibold tnum transition-colors duration-200"
                  style={{
                    background:
                      verdict === "cut"
                        ? "color-mix(in oklab, var(--danger) 22%, transparent)"
                        : verdict === "ok"
                          ? "color-mix(in oklab, var(--ok) 20%, transparent)"
                          : "var(--surface-2)",
                    color:
                      verdict === "cut" ? "var(--danger)" : verdict === "ok" ? "var(--ok-ink)" : "var(--ink-faint)",
                  }}
                  title={verdict === "cut" ? `line ${c.cite} does not exist — transcript ends at ${MAX_IDX}` : `cites line ${c.cite}`}
                >
                  [{c.cite}]
                </span>
              </li>
            );
          })}
        </ul>

        {/* ---- tally ---- */}
        <div
          className="mt-2.5 flex items-center gap-3 rounded-[7px] px-2.5 py-2 text-[11.5px]"
          style={{ background: "var(--surface-2)" }}
        >
          <span className="tnum" style={{ color: "var(--ink-3)" }}>
            <strong style={{ color: "var(--ink)" }}>{shown}</strong> proposed
          </span>
          <span className="tnum" style={{ color: "var(--ok-ink)" }}>
            <strong>{kept}</strong> verified
          </span>
          <span className="tnum" style={{ color: cut ? "var(--danger)" : "var(--ink-faint)" }}>
            <strong>{cut}</strong> deleted
          </span>
        </div>

        <p className="mt-2 text-[10.5px] leading-[1.5]" style={{ color: "var(--ink-faint)" }}>
          Real lines and real model output from the sample call. The deleted one cites line 31 of a
          30-line transcript — the validator&rsquo;s own test case, shown so you can see what
          failure looks like.
        </p>
      </div>
    </div>
  );
}
