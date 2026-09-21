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
// HONESTY, and it is stated in /about too: there is no language model behind
// this. Answers are composed from retrieval over the transcript and the
// structured summary, with a small amount of intent routing. Everything it
// says is a real line somebody really said, with a timestamp — which makes it
// less fluent than an LLM and impossible to hallucinate with. Wiring a model
// in would replace `answer()` and nothing else.
// ---------------------------------------------------------------------------

interface Props {
  meeting: Meeting;
  segments: Segment[];
  summaries: Summary[];
  people: Map<string, Person>;
  onSeek: (ms: number, opts?: { play?: boolean }) => void;
}

const SUGGESTIONS = [
  "What was decided?",
  "What are the risks?",
  "What did we say about the deadline?",
  "Where did people disagree?",
];

export function AskPane({ meeting, segments, summaries, people, onSeek }: Props) {
  const overlay = useOverlay();
  const [draft, setDraft] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
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

  function ask(question: string) {
    const q = question.trim();
    if (!q) return;

    const reply = answer(q, index, meta, summary, segments, people);

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
              Ask anything about this call. Every answer is built from lines that were actually said,
              with the timestamp attached — and threads are kept, so you can come back to them.
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
          placeholder="Ask about this call…"
          aria-label="Ask a question about this call"
          className="w-full rounded-[var(--radius-sm)] px-2.5 py-2 text-[13px] outline-none"
          style={{ background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--line)" }}
        />
        <button
          type="submit"
          disabled={!draft.trim()}
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
