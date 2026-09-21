"use client";

import { useMemo, useRef, useState } from "react";
import { useOverlay } from "@/lib/overlay";
import { clock } from "@/lib/format";
import { buildIndex, search } from "@/lib/search/engine";
import type { AskMessage, AskThread, Meeting, Person, Segment, Summary } from "@/lib/types";
import { Avatar, Icon } from "../ui";

// ---------------------------------------------------------------------------
// Ask.
//
// Fathom's own documentation says: "Ask Fathom's history is not saved. Once
// you exit the call recording view, your previous search results will be
// lost." That is a strange thing to build — the answers are the artefact —
// and it is the cheapest thing on the list to beat. Threads here persist,
// carry citations, and survive a reload.
//
// Two paths, and which one runs depends on where the meeting came from:
//
//   UPLOADED meetings (grounded=true) — segments are retrieved from Postgres
//   full-text search, Claude answers from them, and every citation it returns
//   is checked against the segments table server-side before it is stored or
//   shown. An id the database cannot resolve is dropped, and an answer that
//   loses all of its citations is labelled unsupported rather than presented
//   as fact. That validation step is what makes a citation evidence.
//
//   SEEDED meetings (grounded=false) — no model. Local retrieval over the
//   fixture transcript with shallow intent routing, which is honest about
//   being a demo over demo content.
// ---------------------------------------------------------------------------

interface Props {
  meeting: Meeting;
  segments: Segment[];
  summaries: Summary[];
  people: Map<string, Person>;
  onSeek: (ms: number, opts?: { play?: boolean }) => void;
  /** Raw segments to send to the model, when they differ from `segments`. */
  askSegments?: { speakerLabel: number; startMs: number; endMs: number; text: string; confidence: number }[];
  askSpeakerNames?: Record<string, string>;
}

const SUGGESTIONS = [
  "What was decided?",
  "What are the risks?",
  "What did we say about the deadline?",
  "Where did people disagree?",
];

export function AskPane({
  meeting,
  segments,
  summaries,
  people,
  onSeek,
  askSegments,
  askSpeakerNames,
}: Props) {
  const overlay = useOverlay();
  const [draft, setDraft] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const threads = overlay.state.threads.filter((t) => t.meetingId === meeting.id);
  const active = threads.find((t) => t.id === activeId) ?? threads[0] ?? null;

  const summary = summaries[0];

  const index = useMemo(() => {
    const summaryDocs = summaries.flatMap((s) =>
      s.sections.flatMap((sec) =>
        sec.bullets.map((b) => ({
          segmentId: b.id,
          meetingId: meeting.id,
          anchorMs: b.anchorMs,
          text: b.text,
          speakerId: b.speakerId ?? "",
        })),
      ),
    );
    return buildIndex(segments, summaryDocs);
  }, [segments, summaries, meeting.id]);

  const meta = useMemo(
    () => new Map([[meeting.id, { title: meeting.title, startedAt: meeting.startedAt }]]),
    [meeting],
  );

  // Stable speaker ordering, so a "speaker label" means the same thing on
  // both sides of the request.
  const roster = useMemo(
    () => [...new Set(segments.map((s) => s.speakerId))],
    [segments],
  );

  async function ask(question: string) {
    const q = question.trim();
    if (!q || pending) return;
    setFailed(null);

    let reply: AskMessage;

    // Always try the real model first. Retrieval narrows the transcript to a
    // relevant window locally (that is what the BM25 engine is for now — a
    // retriever in front of a model, rather than a substitute for one), then
    // the server validates every citation the model returns before it comes
    // back. If the key is not configured the endpoint answers 503 and we fall
    // back to local retrieval, which is honest rather than broken.
    setPending(true);
    try {
      const raw = askSegments ?? toRaw(segments, roster);
      const hits = search(index, q, meta, { limit: 40, alpha: 0.4 });
      const hitIdx = new Set<number>();
      for (const h of hits) {
        const i = raw.findIndex((r) => r.startMs === h.anchorMs);
        if (i >= 0) for (let d = -1; d <= 1; d++) hitIdx.add(i + d);
      }
      const candidateIdxs = [...hitIdx].filter((i) => i >= 0 && i < raw.length).sort((a, b) => a - b);

      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          segments: raw,
          speakerNames: askSpeakerNames ?? namesFor(roster, people),
          candidateIdxs: candidateIdxs.length ? candidateIdxs : undefined,
        }),
      });

      if (res.status === 503) {
        reply = answer(q, index, meta, summary, segments, people);
      } else {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Ask failed");
        reply = {
          id: `am-${Date.now().toString(36)}`,
          role: "assistant",
          text: json.grounded
            ? json.text
            : `${json.text}\n\n(Nothing in the transcript could be cited for this, so treat it as unsupported.)`,
          citations: (json.citations ?? []).map(
            (c: { segmentIdx: number; anchorMs: number; snippet: string }) => ({
              meetingId: meeting.id,
              segmentId: segments[c.segmentIdx]?.id ?? "",
              anchorMs: c.anchorMs,
              snippet: c.snippet,
            }),
          ),
          createdAt: new Date().toISOString(),
        };
      }
    } catch (e) {
      setFailed(e instanceof Error ? e.message : "Ask failed");
      setPending(false);
      return;
    }
    setPending(false);

    const userMsg: AskMessage = {
      id: `um-${Date.now().toString(36)}`,
      role: "user",
      text: q,
      citations: [],
      createdAt: new Date().toISOString(),
    };

    const thread: AskThread = active
      ? { ...active, messages: [...active.messages, userMsg, reply] }
      : {
          id: `th-${Date.now().toString(36)}`,
          meetingId: meeting.id,
          title: q.length > 48 ? q.slice(0, 48) + "…" : q,
          messages: [userMsg, reply],
          createdAt: new Date().toISOString(),
        };

    overlay.upsertThread(thread);
    setActiveId(thread.id);
    setDraft("");
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-3.5">
        {threads.length > 1 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {threads.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className="max-w-[170px] truncate rounded-full px-2.5 py-[3px] text-[11.5px] font-medium"
                style={{
                  background: t.id === active?.id ? "var(--accent-soft)" : "var(--surface-2)",
                  color: t.id === active?.id ? "var(--accent-ink)" : "var(--ink-3)",
                }}
              >
                {t.title}
              </button>
            ))}
            <button
              onClick={() => setActiveId("new")}
              className="rounded-full px-2 py-[3px] text-[11.5px]"
              style={{ color: "var(--ink-3)" }}
            >
              + New
            </button>
          </div>
        )}

        {!active && (
          <div className="pt-3">
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--ink-2)" }}>
              Claude reads this transcript and answers from it. Every citation is checked against a
              real line before you see it — anything it can&rsquo;t ground is dropped, and an answer
              with no citations left is labelled unsupported rather than shown as fact.
            </p>
            <div className="mt-3 flex flex-col gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-[12.5px] transition-colors hover:bg-[var(--surface-2)]"
                  style={{ color: "var(--ink-2)", border: "1px solid var(--line)" }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {active?.messages.map((m) => (
          <div key={m.id} className="mb-3.5">
            {m.role === "user" ? (
              <div
                className="ml-auto max-w-[88%] rounded-[var(--radius)] px-3 py-2 text-[13px]"
                style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
              >
                {m.text}
              </div>
            ) : (
              <div>
                <p className="text-[13px] leading-[1.6] whitespace-pre-line" style={{ color: "var(--ink-2)" }}>
                  {m.text}
                </p>
                {m.citations.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1">
                    {m.citations.map((c, i) => {
                      const p = people.get(c.meetingId === meeting.id ? speakerFor(segments, c.segmentId) : "");
                      return (
                        <li key={i}>
                          <button
                            onClick={() => onSeek(c.anchorMs, { play: true })}
                            className="flex w-full gap-2 rounded-[var(--radius-sm)] p-1.5 text-left transition-colors hover:bg-[var(--surface-2)]"
                          >
                            <span
                              className="mt-[3px] shrink-0 text-[10.5px] font-semibold tnum"
                              style={{ color: "var(--accent-ink)" }}
                            >
                              {clock(c.anchorMs)}
                            </span>
                            <span className="min-w-0 flex-1 text-[12px] leading-snug" style={{ color: "var(--ink-3)" }}>
                              {p && (
                                <span className="mr-1 inline-flex align-[-2px]">
                                  <Avatar person={p} size={13} />
                                </span>
                              )}
                              {c.snippet}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        ))}
        {pending && (
          <p className="text-[12.5px]" style={{ color: "var(--accent-ink)" }}>
            Reading the transcript…
          </p>
        )}
        {failed && (
          <p
            className="rounded-[var(--radius-sm)] p-2 font-mono text-[11.5px]"
            style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
          >
            {failed}
          </p>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(draft);
        }}
        className="flex shrink-0 items-center gap-2 p-2.5"
        style={{ borderTop: "1px solid var(--line)" }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={pending ? "Thinking…" : "Ask about this call…"}
          disabled={pending}
          aria-label="Ask a question about this call"
          className="w-full rounded-[var(--radius-sm)] px-2.5 py-2 text-[13px] outline-none"
          style={{ background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--line)" }}
        />
        <button
          type="submit"
          disabled={!draft.trim() || pending}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-sm)] disabled:opacity-40"
          style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          aria-label="Ask"
        >
          <Icon name="sparkle" size={14} />
        </button>
      </form>
    </div>
  );
}

function speakerFor(segments: Segment[], segmentId: string): string {
  return segments.find((s) => s.id === segmentId)?.speakerId ?? "";
}

/**
 * Compose an answer from retrieval plus the structured summary.
 *
 * Intent routing is deliberately shallow — four buckets and a default. A
 * deeper classifier would be guessing, and guessing wrong here means
 * confidently answering a question nobody asked.
 */
function answer(
  q: string,
  index: ReturnType<typeof buildIndex>,
  meta: Map<string, { title: string; startedAt: string }>,
  summary: Summary | undefined,
  segments: Segment[],
  people: Map<string, Person>,
): AskMessage {
  const lower = q.toLowerCase();
  const hits = search(index, q, meta, { limit: 6, alpha: 0.4 });

  const sectionLike = (needle: RegExp) =>
    summary?.sections.find((s) => needle.test(s.heading.toLowerCase()));

  let text: string;
  let citations = hits.slice(0, 4).map((h) => ({
    meetingId: h.meetingId,
    segmentId: h.segmentId,
    anchorMs: h.anchorMs,
    snippet: h.plain.length > 150 ? h.plain.slice(0, 150) + "…" : h.plain,
  }));

  if (/\b(decide|decided|decision|agreed|conclusion)\b/.test(lower)) {
    const sec = sectionLike(/decision/);
    if (sec?.bullets.length) {
      text =
        "Decisions from this call:\n\n" +
        sec.bullets.map((b) => `• ${b.text}`).join("\n");
      citations = sec.bullets.slice(0, 5).map((b) => ({
        meetingId: summary!.meetingId,
        segmentId: b.id,
        anchorMs: b.anchorMs,
        snippet: nearestLine(segments, b.anchorMs),
      }));
    } else {
      text = "Nothing on this call was framed as a firm decision. The closest moments:";
    }
  } else if (/\b(risk|worry|concern|blocker|danger|problem)\b/.test(lower)) {
    const sec = sectionLike(/risk|did not|blocker|objection/);
    if (sec?.bullets.length) {
      text = `Risks and concerns raised:\n\n` + sec.bullets.map((b) => `• ${b.text}`).join("\n");
      citations = sec.bullets.slice(0, 5).map((b) => ({
        meetingId: summary!.meetingId,
        segmentId: b.id,
        anchorMs: b.anchorMs,
        snippet: nearestLine(segments, b.anchorMs),
      }));
    } else {
      text = "No section of the summary is framed as risk. The most relevant moments:";
    }
  } else if (/\b(disagree|argue|argument|push back|pushback|tension)\b/.test(lower)) {
    const contested = segments
      .filter((s) => s.crosstalk || /\b(disagree|push back|object|not against|I'd argue|wrong)\b/i.test(s.text))
      .slice(0, 5);
    if (contested.length) {
      text =
        "The call gets contested in a few places — overlapping speech and explicit pushback. Here is where:";
      citations = contested.map((s) => ({
        meetingId: s.meetingId,
        segmentId: s.id,
        anchorMs: s.startMs,
        snippet: `${people.get(s.speakerId)?.name.split(" ")[0] ?? "?"}: ${s.text.slice(0, 140)}`,
      }));
    } else {
      text = "This one stayed pretty consensual — no sustained disagreement in the transcript.";
    }
  } else if (/\bwho\b/.test(lower)) {
    const top = hits[0];
    if (top) {
      const name = people.get(speakerFor(segments, top.segmentId))?.name;
      text = name
        ? `${name} is the closest match. The line that answers it:`
        : "Closest matches in the transcript:";
    } else {
      text = "Nothing in this transcript matches that.";
    }
  } else if (!hits.length) {
    text =
      "Nothing in this call's transcript or summary matches that. Try different wording, or search across every meeting instead.";
  } else {
    text = `Here is what was said about that, in order of relevance:`;
  }

  return {
    id: `am-${Date.now().toString(36)}`,
    role: "assistant",
    text,
    citations,
    createdAt: new Date().toISOString(),
  };
}

function nearestLine(segments: Segment[], ms: number): string {
  const s =
    segments.find((x) => ms >= x.startMs && ms <= x.endMs) ??
    segments.reduce((best, x) =>
      Math.abs(x.startMs - ms) < Math.abs(best.startMs - ms) ? x : best,
    );
  return s.text.length > 150 ? s.text.slice(0, 150) + "…" : s.text;
}

/** Segments in the shape the API expects, with a numeric speaker label. */
function toRaw(
  segments: Segment[],
  roster: string[],
): { speakerLabel: number; startMs: number; endMs: number; text: string; confidence: number }[] {
  return segments.map((s) => ({
    speakerLabel: Math.max(0, roster.indexOf(s.speakerId)),
    startMs: s.startMs,
    endMs: s.endMs,
    text: s.text,
    confidence: s.confidence,
  }));
}

function namesFor(roster: string[], people: Map<string, Person>): Record<number, string> {
  const out: Record<number, string> = {};
  roster.forEach((id, i) => {
    out[i] = people.get(id)?.name ?? `Speaker ${i + 1}`;
  });
  return out;
}
