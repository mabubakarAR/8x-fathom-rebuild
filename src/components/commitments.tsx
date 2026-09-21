"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Claim } from "@/lib/commitments/collect";
import { clock, when } from "@/lib/format";
import { Icon } from "./ui";
import { PageHeader } from "./page-header";

// Commitments.
//
// The thing this product does that no other notetaker does.
//
// Every tool in the category is excellent at one meeting and blind across
// them. Nobody forgets what was said in the room — they forget that three
// weeks later a different room reversed it, and the notes from both rooms
// are individually correct, which is exactly why the contradiction survives
// to bite someone.
//
// So: every commitment across every call, checked against every other call,
// with both moments cited and one click to each. Fathom's Trackers watch
// topics. This watches promises.

type Verdict = "contradicted" | "revised" | "kept";

interface Finding {
  verdict: Verdict;
  note: string;
  confidence: number;
  earlier: Claim;
  later: Claim;
}

interface Scan {
  model: string;
  at: string;
  scanned: {
    meetings: number;
    claims: number;
    pairsCompared: number;
    verdictsProposed: number;
    verdictsDropped: number;
  };
  findings: Finding[];
}

const KEY = "8x-fathom-rebuild.commitments.v1";

const TONE: Record<Verdict, { bg: string; ink: string; label: string; icon: "warn" | "chevron" | "check" }> = {
  contradicted: { bg: "var(--danger-soft)", ink: "var(--danger)", label: "Contradicted", icon: "warn" },
  revised: { bg: "var(--warn-soft)", ink: "var(--warn-ink)", label: "Revised", icon: "chevron" },
  kept: { bg: "var(--ok-soft)", ink: "var(--ok-ink)", label: "Held", icon: "check" },
};

export function Commitments({ configured }: { configured: boolean }) {
  const [scan, setScan] = useState<Scan | null>(null);
  // Loaded after mount, not during render, so the server HTML and the first
  // client render agree. See the note on this file in eslint.config.mjs.
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKept, setShowKept] = useState(false);

  useEffect(() => {
    let cached: Scan | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) cached = JSON.parse(raw) as Scan;
    } catch {
      /* private mode — the scan button still works, it just won't persist */
    }
    if (cached) setScan(cached);
    setHydrated(true);
  }, []);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/commitments", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Scan failed");
      const next: Scan = { ...json, at: new Date().toISOString() };
      setScan(next);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* quota — the result still shows for this session */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setBusy(false);
    }
  }

  const contradicted = scan?.findings.filter((f) => f.verdict === "contradicted") ?? [];
  const revised = scan?.findings.filter((f) => f.verdict === "revised") ?? [];
  const kept = scan?.findings.filter((f) => f.verdict === "kept") ?? [];

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 pb-24 md:px-8">
      <PageHeader
        title="Commitments"
        subtitle="Every promise made across your calls, checked against every other call."
        actions={
          <button
            onClick={run}
            disabled={busy || !configured}
            className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] px-3.5 py-[8px] text-[13px] font-semibold disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            <Icon name={busy ? "dot" : "sparkle"} size={14} />
            {busy ? "Scanning…" : scan ? "Scan again" : "Scan all meetings"}
          </button>
        }
      />

      {!configured && (
        <p
          className="mb-4 rounded-[var(--radius)] px-3.5 py-2.5 text-[12.5px]"
          style={{ background: "var(--warn-soft)", color: "var(--ink-2)" }}
        >
          <strong>No <code>ANTHROPIC_API_KEY</code> on this deployment,</strong> so the scan cannot
          run. It is a real model pass over real claims, not a lookup table.
        </p>
      )}
      {error && <p className="mb-4 text-[13px]" style={{ color: "var(--danger)" }}>{error}</p>}

      {hydrated && !scan && !busy && (
        <div
          className="rounded-[var(--radius-lg)] px-6 py-12 text-center"
          style={{ background: "var(--surface)", border: "1px dashed var(--line-strong)" }}
        >
          <h2 className="text-[17px] font-semibold" style={{ color: "var(--ink)" }}>
            Nobody forgets what was said in the room
          </h2>
          <p
            className="mx-auto mt-2 max-w-[54ch] text-[13.5px] leading-[1.6]"
            style={{ color: "var(--ink-3)" }}
          >
            They forget that three weeks later a different room reversed it — and the notes from
            both meetings are individually correct, which is exactly why nobody catches it. This
            takes every decision, date and owner across your calls and checks each one against
            every other call.
          </p>
        </div>
      )}

      {busy && (
        <div
          className="rounded-[var(--radius-lg)] px-6 py-10 text-center text-[13.5px]"
          style={{ background: "var(--surface)", border: "1px solid var(--line)", color: "var(--ink-2)" }}
        >
          Reading every commitment, then comparing each one against the other meetings. Twenty to
          forty seconds — it is a real model pass, nothing is cached.
        </div>
      )}

      {scan && !busy && (
        <>
          <div
            className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[var(--radius)] px-4 py-3 text-[12px]"
            style={{ background: "var(--surface-2)", color: "var(--ink-3)" }}
          >
            <span className="tnum">
              <strong style={{ color: "var(--ink)" }}>{scan.scanned.claims}</strong> commitments across{" "}
              <strong style={{ color: "var(--ink)" }}>{scan.scanned.meetings}</strong> meetings
            </span>
            <span className="tnum">
              <strong style={{ color: "var(--ink)" }}>{scan.scanned.pairsCompared}</strong> pairs compared
            </span>
            <span className="tnum" style={{ color: contradicted.length ? "var(--danger)" : "var(--ink-3)" }}>
              <strong>{contradicted.length}</strong> contradicted
            </span>
            {scan.scanned.verdictsDropped > 0 && (
              <span className="tnum" style={{ color: "var(--warn-ink)" }}>
                <strong>{scan.scanned.verdictsDropped}</strong> verdicts discarded
              </span>
            )}
            <span className="ml-auto" style={{ color: "var(--ink-faint)" }}>
              {scan.model} · {when(scan.at)}
            </span>
          </div>

          {contradicted.length === 0 && revised.length === 0 && (
            <p
              className="rounded-[var(--radius)] px-4 py-6 text-center text-[13.5px]"
              style={{ background: "var(--ok-soft)", color: "var(--ink-2)" }}
            >
              Nothing contradicted itself across these meetings.
            </p>
          )}

          {contradicted.map((f, i) => <Row key={`c${i}`} f={f} />)}
          {revised.map((f, i) => <Row key={`r${i}`} f={f} />)}

          {kept.length > 0 && (
            <>
              <button
                onClick={() => setShowKept((v) => !v)}
                className="mt-2 mb-3 flex items-center gap-1.5 text-[12.5px] font-medium"
                style={{ color: "var(--ink-3)" }}
              >
                <span className="transition-transform" style={{ transform: showKept ? "rotate(90deg)" : "none" }}>
                  <Icon name="chevron" size={12} />
                </span>
                {kept.length} commitments held
              </button>
              {showKept && kept.map((f, i) => <Row key={`k${i}`} f={f} />)}
            </>
          )}
        </>
      )}
    </div>
  );
}

function Row({ f }: { f: Finding }) {
  const tone = TONE[f.verdict];
  return (
    <article
      className="mb-3 overflow-hidden rounded-[var(--radius-lg)]"
      style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
    >
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5" style={{ background: tone.bg }}>
        <span
          className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.05em] uppercase"
          style={{ color: tone.ink }}
        >
          <Icon name={tone.icon} size={12} /> {tone.label}
        </span>
        <span className="text-[12.5px] leading-[1.5]" style={{ color: "var(--ink-2)" }}>
          {f.note}
        </span>
        <span className="ml-auto text-[11px] tnum" style={{ color: "var(--ink-faint)" }}>
          {Math.round(f.confidence * 100)}% confident
        </span>
      </div>

      <div className="grid gap-px md:grid-cols-2" style={{ background: "var(--line)" }}>
        <Side c={f.earlier} label="Said first" />
        <Side c={f.later} label="Then later" />
      </div>
    </article>
  );
}

function Side({ c, label }: { c: Claim; label: string }) {
  return (
    <Link
      href={`/m/${c.meetingId}?t=${Math.round(c.anchorMs)}`}
      className="group block p-3.5 transition-colors hover:bg-[var(--surface-hover)]"
      style={{ background: "var(--surface)" }}
    >
      <div className="mb-1 flex items-center gap-2 text-[10.5px] font-semibold tracking-[0.05em] uppercase" style={{ color: "var(--ink-faint)" }}>
        {label}
      </div>
      <p className="text-[13px] leading-[1.55]" style={{ color: "var(--ink)" }}>
        {c.text}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px]" style={{ color: "var(--ink-3)" }}>
        <span className="font-medium group-hover:underline" style={{ color: "var(--accent-ink)" }}>
          {c.meetingTitle}
        </span>
        <span aria-hidden>·</span>
        <span>{when(c.startedAt)}</span>
        <span aria-hidden>·</span>
        <span className="tnum">{clock(c.anchorMs)}</span>
        {c.speakerName && c.speakerName !== "Unknown" && (
          <>
            <span aria-hidden>·</span>
            <span>{c.speakerName}</span>
          </>
        )}
      </div>
    </Link>
  );
}
