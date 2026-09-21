"use client";

import { useState } from "react";
import type { DroppedClaim, EvidenceLedger } from "@/lib/evidence";
import { Icon, SectionLabel } from "../ui";

// The evidence panel.
//
// Every AI notetaker on the market claims its summary is "grounded in your
// transcript". None of them show their working, because showing it means
// admitting the model sometimes cites a line that does not exist.
//
// This panel is that admission, made deliberately. It shows the funnel —
// claims proposed by the model, claims that resolved to a real transcript
// line, claims thrown away — and it quotes the thrown-away ones verbatim with
// the index the model invented. A drop is not a defect being hidden; it is
// the validator doing the job the product is built around.
//
// If this panel ever reads "0 dropped" for every transcript, that is worth
// being suspicious about, so the empty state says what would appear here
// rather than declaring victory.

const KIND_LABEL: Record<DroppedClaim["kind"], string> = {
  chapter: "Chapter",
  bullet: "Summary claim",
  action: "Action item",
  highlight: "Clip",
};

export function EvidencePane({ ledger }: { ledger: EvidenceLedger }) {
  const [open, setOpen] = useState(true);
  const { proposed, resolved, dropped } = ledger;
  const rate = proposed ? resolved / proposed : 1;
  const pct = Math.round(rate * 100);

  return (
    <div className="p-3.5">
      <div className="mb-1.5">
        <SectionLabel>Grounding</SectionLabel>
      </div>

      <p className="mb-3 text-[12px] leading-[1.6]" style={{ color: "var(--ink-3)" }}>
        The model was shown {ledger.segmentCount} numbered transcript lines and required to cite one
        for every claim. Each citation was then checked against the real array before anything
        reached this screen.
      </p>

      {/* ---- the funnel ---- */}
      <div
        className="mb-3 rounded-[var(--radius)] p-3"
        style={{ background: "var(--surface-2)" }}
      >
        <div className="flex items-end gap-3">
          <Stat value={proposed} label="claims proposed" />
          <Arrow />
          <Stat value={resolved} label="anchored to a real line" tone="ok" />
          <Arrow />
          <Stat value={dropped.length} label="thrown away" tone={dropped.length ? "warn" : "mute"} />
        </div>

        {/* A bar, not a donut: the whole point is that the two parts are the
            same quantity split, and a bar makes the split literal. */}
        <div
          className="mt-3 flex h-[7px] overflow-hidden rounded-full"
          style={{ background: "var(--line)" }}
        >
          <div style={{ width: `${pct}%`, background: "var(--ok)" }} />
          <div style={{ width: `${100 - pct}%`, background: dropped.length ? "var(--warn)" : "transparent" }} />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px]" style={{ color: "var(--ink-faint)" }}>
          <span className="tnum">{pct}% of what the model said survived validation</span>
          <span className="tnum">{(ledger.elapsedMs / 1000).toFixed(1)}s</span>
        </div>
      </div>

      {/* ---- the dropped claims ---- */}
      {dropped.length > 0 ? (
        <>
          <button
            onClick={() => setOpen((v) => !v)}
            className="mb-2 flex w-full items-center gap-1.5 text-[12.5px] font-semibold"
            style={{ color: "var(--ink)" }}
          >
            <span
              className="transition-transform"
              style={{ transform: open ? "rotate(90deg)" : "none", color: "var(--ink-3)" }}
            >
              <Icon name="chevron" size={13} />
            </span>
            What was thrown away
            <span
              className="ml-auto rounded-full px-1.5 text-[10.5px] font-semibold tnum"
              style={{ background: "var(--warn-soft)", color: "var(--warn-ink)" }}
            >
              {dropped.length}
            </span>
          </button>

          {open && (
            <ul className="flex flex-col gap-1.5">
              {dropped.map((d, i) => (
                <li
                  key={i}
                  className="rounded-[var(--radius-sm)] p-2"
                  style={{ background: "var(--warn-soft)", border: "1px solid var(--line)" }}
                >
                  <div className="mb-1 flex items-center gap-1.5 text-[10.5px] font-semibold tracking-[0.04em] uppercase" style={{ color: "var(--warn-ink)" }}>
                    {KIND_LABEL[d.kind]}
                    <span style={{ color: "var(--ink-faint)" }}>· {d.where}</span>
                  </div>
                  <p
                    className="text-[12.5px] leading-[1.5] line-through"
                    style={{ color: "var(--ink-3)" }}
                  >
                    {d.text}
                  </p>
                  <p className="mt-1 text-[11px]" style={{ color: "var(--ink-faint)" }}>
                    {d.reason}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-2.5 text-[11px] leading-[1.6]" style={{ color: "var(--ink-faint)" }}>
            These were dropped, not repaired. Guessing a nearby line would have produced a citation
            that looks right and points at the wrong words, which is worse than no claim at all.
          </p>
        </>
      ) : (
        <div
          className="rounded-[var(--radius)] p-3 text-[12px] leading-[1.6]"
          style={{ background: "var(--ok-soft)", color: "var(--ink-2)" }}
        >
          <strong style={{ color: "var(--ok-ink)" }}>Nothing was dropped on this run.</strong>{" "}
          Every claim the model made cited a line between 0 and {ledger.maxIdx}. When it doesn&rsquo;t
          — and on long or noisy transcripts it does — the claim appears here struck through, with
          the index it invented, instead of being quietly repaired to the nearest plausible line.
        </div>
      )}

      <p className="mt-3 text-[11px]" style={{ color: "var(--ink-faint)" }}>
        Model: <span style={{ color: "var(--ink-3)" }}>{ledger.model}</span> · lines 0–{ledger.maxIdx}
      </p>
    </div>
  );
}

function Stat({
  value,
  label,
  tone = "default",
}: {
  value: number;
  label: string;
  tone?: "default" | "ok" | "warn" | "mute";
}) {
  const color =
    tone === "ok" ? "var(--ok-ink)" : tone === "warn" ? "var(--warn-ink)" : tone === "mute" ? "var(--ink-faint)" : "var(--ink)";
  return (
    <div className="min-w-0 flex-1">
      <div className="text-[21px] leading-none font-semibold tnum" style={{ color }}>
        {value}
      </div>
      <div className="mt-1 text-[10.5px] leading-[1.3]" style={{ color: "var(--ink-faint)" }}>
        {label}
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <span className="shrink-0 pb-4" style={{ color: "var(--ink-faint)" }}>
      <Icon name="chevron" size={13} />
    </span>
  );
}
