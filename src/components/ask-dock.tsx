"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { clock, shortDate } from "@/lib/format";
import { Icon } from "./ui";
import { Prose, type Answer } from "./workspace-ask";

// The Ask dock.
//
// Fathom's account-level Ask is a half-panel on the home page. Here it is a
// dock on the right of every page: open it, ask, and the answer stays put
// while you click through to the moments it cites. A conversation about your
// meetings should not live on one page.
//
// Every citation names the meeting, the speaker and the second, and links
// to that moment. The ledger under each answer says how many citations were
// proposed and how many survived being checked against the transcript.

const STARTERS = [
  "What did we promise, and to whom?",
  "Where did people disagree?",
  "What is still open from this week?",
  "Did anything get decided and then reversed?",
];

interface Turn { q: string; a: Answer | null; error?: string }

export function AskDock({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { if (open) setTimeout(() => input.current?.focus(), 60); }, [open]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [turns.length, busy]);

  async function ask(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    setDraft("");
    setBusy(true);
    setTurns((t) => [...t, { q: question, a: null }]);
    try {
      const res = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Ask failed");
      setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, a: json as Answer } : x)));
    } catch (e) {
      setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, error: e instanceof Error ? e.message : "Ask failed" } : x)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside
      aria-hidden={!open}
      className="fixed inset-y-0 right-0 z-40 flex w-full flex-col transition-transform duration-300 md:sticky md:top-0 md:h-screen md:w-[400px] md:shrink-0"
      style={{
        background: "var(--bg-sunken)",
        borderLeft: "1px solid var(--line)",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transitionTimingFunction: "var(--ease)",
        // On desktop the closed dock collapses out of the flow rather than
        // sitting off-screen taking up 400px of layout.
        marginRight: open ? 0 : undefined,
        display: open ? undefined : "none",
      }}
    >
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--line)" }}>
        <span style={{ color: "var(--accent)" }}><Icon name="sparkle" size={15} /></span>
        <h2 className="text-[13.5px] font-semibold" style={{ color: "var(--ink)" }}>Ask your meetings</h2>
        <span className="text-[11px]" style={{ color: "var(--ink-faint)" }}>every call, cited</span>
        <button onClick={onClose} className="ml-auto grid h-7 w-7 place-items-center rounded-[7px]" style={{ color: "var(--ink-3)" }} aria-label="Close">
          <Icon name="close" size={14} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {turns.length === 0 && (
          <div className="flex h-full flex-col justify-end gap-2 pb-2">
            <p className="mb-1 text-[12.5px] leading-[1.5]" style={{ color: "var(--ink-3)" }}>
              Answers come only from lines in your transcripts. Each claim is tied to the meeting, the speaker and the second — or it is dropped.
            </p>
            {STARTERS.map((s) => (
              <button key={s} onClick={() => ask(s)} className="rounded-[10px] px-3 py-2 text-left text-[13px]" style={{ background: "var(--surface)", color: "var(--ink-2)", border: "1px solid var(--line)" }}>
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-5">
          {turns.map((t, i) => (
            <div key={i}>
              <div className="mb-2 flex justify-end">
                <div className="max-w-[88%] rounded-[12px] rounded-br-[4px] px-3 py-2 text-[13px] leading-[1.45]" style={{ background: "var(--accent-soft)", color: "var(--ink)" }}>
                  {t.q}
                </div>
              </div>
              {!t.a && !t.error && (
                <div className="px-1">
                  <div className="h-[6px] w-full overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
                    <div className="evidence-fill h-full" style={{ background: "var(--accent)" }} />
                  </div>
                  <p className="mt-1.5 text-[11.5px]" style={{ color: "var(--ink-faint)" }}>Reading the transcripts, then checking every citation…</p>
                </div>
              )}
              {t.error && <p className="text-[12.5px]" style={{ color: "var(--warn)" }}>{t.error}</p>}
              {t.a && (
                <div className="rounded-[12px] rounded-bl-[4px] px-3.5 py-3" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
                  {!t.a.grounded && (
                    <p className="mb-2 rounded-[8px] px-2.5 py-1.5 text-[12px]" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>
                      Not grounded — nothing here could be tied to a transcript line.
                    </p>
                  )}
                  <div className="text-[13px]"><Prose text={t.a.text} /></div>
                  {t.a.citations.length > 0 && (
                    <div className="mt-3 flex flex-col gap-1.5">
                      {t.a.citations.map((c) => (
                        <Link key={c.segmentId} href={`/m/${c.meetingId}?t=${Math.round(c.anchorMs)}`} className="block rounded-[9px] px-2.5 py-2" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
                          <div className="flex flex-wrap items-baseline gap-x-2 text-[11px]">
                            <span className="font-semibold" style={{ color: "var(--accent-ink)" }}>{c.meetingTitle}</span>
                            <span className="tnum" style={{ color: "var(--ink-faint)" }}>{c.startedAt ? shortDate(c.startedAt) : ""} · {clock(c.anchorMs)}</span>
                            <span style={{ color: "var(--ink-3)" }}>{c.speakerName}</span>
                          </div>
                          <p className="mt-0.5 text-[12px] leading-[1.45]" style={{ color: "var(--ink-2)" }}>“{c.snippet}”</p>
                        </Link>
                      ))}
                    </div>
                  )}
                  <div className="mt-2.5 flex flex-wrap gap-x-3 text-[10.5px] tnum" style={{ color: "var(--ink-faint)" }}>
                    <span>{t.a.citations.length} anchored</span>
                    {t.a.dropped.length > 0 && <span style={{ color: "var(--warn)" }}>{t.a.dropped.length} discarded</span>}
                    <span>{t.a.linesConsidered} lines · {t.a.meetingsSearched} meetings</span>
                    <span>{(t.a.elapsedMs / 1000).toFixed(1)}s</span>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={end} />
        </div>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); ask(draft); }}
        className="px-4 pb-4 pt-2"
        style={{ borderTop: "1px solid var(--line)" }}
      >
        <div className="flex items-end gap-2 rounded-[12px] px-3 py-2" style={{ background: "var(--surface)", border: "1px solid var(--line-strong)" }}>
          <textarea
            ref={input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(draft); } }}
            rows={1}
            placeholder="Ask anything about your meetings…"
            className="max-h-[120px] min-h-[24px] w-full resize-none bg-transparent text-[13.5px] leading-[1.5] outline-none"
            style={{ color: "var(--ink)" }}
          />
          <button type="submit" disabled={busy || !draft.trim()} className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] disabled:opacity-40" style={{ background: "var(--accent)", color: "var(--on-accent)" }} aria-label="Ask">
            <Icon name="chevron" size={14} />
          </button>
        </div>
      </form>
    </aside>
  );
}
