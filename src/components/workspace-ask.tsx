"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { clock } from "@/lib/format";
import { Icon } from "./ui";

// Ask the workspace.
//
// Search gives you moments. This gives you the answer, and then shows its
// work: which meeting, which speaker, which second, quoted. The citations
// are not a footnote — they are the product, and the ledger underneath says
// how many the model proposed and how many survived being checked against
// the transcript.
//
// It sits on the search page on purpose. Typing a question and getting back
// "here is the answer, and here are the four moments it came from, across
// three meetings, oldest first" is the thing a folder of recordings can
// never do, and it reads immediately.

interface Citation {
  segmentId: string;
  meetingId: string;
  meetingTitle: string;
  startedAt: string;
  anchorMs: number;
  speakerName: string;
  snippet: string;
}

interface Answer {
  text: string;
  citations: Citation[];
  dropped: string[];
  meetingsSearched: number;
  linesConsidered: number;
  elapsedMs: number;
  model: string;
  grounded: boolean;
}

export function WorkspaceAsk({ question }: { question: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Which question the current answer belongs to, so navigating to a new
  // search doesn't leave a stale answer sitting under a different query.
  const asked = useRef<string>("");

  useEffect(() => {
    if (asked.current && asked.current !== question) {
      setAnswer(null);
      setError(null);
      setOpen(false);
    }
  }, [question]);

  async function run() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setOpen(true);
    asked.current = question;
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Ask failed");
      setAnswer(json as Answer);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ask failed");
    } finally {
      setBusy(false);
    }
  }

  if (!question) return null;

  return (
    <div
      className="mb-4 overflow-hidden rounded-[var(--radius-lg)] raised"
      style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
    >
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold" style={{ color: "var(--ink)" }}>
            Answer this from every meeting
          </p>
          <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--ink-3)" }}>
            Search finds the moments. This reads them and answers — and shows which lines it used.
          </p>
        </div>
        <button
          onClick={run}
          disabled={busy}
          className="shrink-0 rounded-[var(--radius)] px-3.5 py-2 text-[12.5px] font-semibold lift-hover"
          style={{
            background: busy ? "var(--surface-2)" : "var(--accent)",
            color: busy ? "var(--ink-3)" : "var(--on-accent)",
            border: "1px solid var(--line)",
          }}
        >
          {busy ? "Reading the transcripts…" : answer ? "Ask again" : "Ask the workspace"}
        </button>
      </div>

      {open && (
        <div style={{ borderTop: "1px solid var(--line)" }}>
          {busy && (
            <div className="px-4 py-4">
              <div className="h-[9px] w-full overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
                <div className="evidence-fill h-full" style={{ background: "var(--accent)" }} />
              </div>
              <p className="mt-2 text-[12px]" style={{ color: "var(--ink-faint)" }}>
                Retrieving candidate lines, then checking every citation the model returns.
              </p>
            </div>
          )}

          {error && (
            <p className="px-4 py-4 text-[13px]" style={{ color: "var(--warn)" }}>
              {error}
            </p>
          )}

          {answer && !busy && (
            <div className="px-4 py-4">
              {!answer.grounded && (
                <p
                  className="mb-3 rounded-[var(--radius)] px-3 py-2 text-[12.5px]"
                  style={{ background: "var(--warn-soft)", color: "var(--warn)" }}
                >
                  Not grounded — nothing it said could be tied back to a line in the transcript, so
                  treat this as unverified.
                </p>
              )}

              <div
                className="whitespace-pre-wrap text-[14px] leading-[1.6]"
                style={{ color: "var(--ink)" }}
              >
                {answer.text}
              </div>

              {answer.citations.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  {answer.citations.map((c) => (
                    <Link
                      key={c.segmentId}
                      href={`/m/${c.meetingId}?t=${Math.round(c.anchorMs)}`}
                      className="group block rounded-[var(--radius)] px-3 py-2.5 lift-hover"
                      style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}
                    >
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-[12px] font-semibold" style={{ color: "var(--accent-ink)" }}>
                          {c.meetingTitle}
                        </span>
                        <span className="text-[11.5px] tnum" style={{ color: "var(--ink-faint)" }}>
                          {c.startedAt ? new Date(c.startedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
                          {" · "}
                          {clock(c.anchorMs)}
                        </span>
                        <span className="text-[11.5px]" style={{ color: "var(--ink-3)" }}>
                          {c.speakerName}
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] leading-[1.5]" style={{ color: "var(--ink-2)" }}>
                        “{c.snippet}”
                      </p>
                    </Link>
                  ))}
                </div>
              )}

              {/* The ledger. Same discipline as the summary pipeline: say how
                  many citations were proposed, how many survived, and name the
                  ones that didn't rather than quietly deleting them. */}
              <div
                className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 text-[11.5px]"
                style={{ borderTop: "1px solid var(--line)", color: "var(--ink-faint)" }}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="check" size={13} />
                  <span className="tnum">{answer.citations.length}</span> citations anchored
                </span>
                {answer.dropped.length > 0 && (
                  <span style={{ color: "var(--warn)" }}>
                    <span className="tnum">{answer.dropped.length}</span> discarded — the model cited{" "}
                    {answer.dropped.slice(0, 3).join(", ")} which it was never given
                  </span>
                )}
                <span>
                  read <span className="tnum">{answer.linesConsidered}</span> lines across{" "}
                  <span className="tnum">{answer.meetingsSearched}</span>{" "}
                  {answer.meetingsSearched === 1 ? "meeting" : "meetings"}
                </span>
                <span className="tnum">{(answer.elapsedMs / 1000).toFixed(1)}s</span>
                <span>{answer.model}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
