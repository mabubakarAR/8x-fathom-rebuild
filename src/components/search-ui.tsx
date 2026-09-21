"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { clock, when } from "@/lib/format";
import type { Person, SearchHit } from "@/lib/types";
import { Avatar, Badge, Icon, speakerVar } from "./ui";
import { PageHeader } from "./page-header";

// Search.
//
// One ranked list. Fathom puts keyword results first and hides semantic
// results below a "Find <query> with AI" link, which makes the better
// retriever opt-in — that ordering is the thing being inverted here.
//
// The blend slider is exposed on purpose. It is not a setting most users would
// ever touch, but it makes the two scorers legible: drag to 0 and it's pure
// BM25, drag to 1 and it's pure vector similarity, and you can watch the
// ranking change. Each result shows its own L/S split for the same reason.

const EXAMPLES = [
  "churn risk",
  "who promised December",
  "why does search feel slow",
  "security review deadline",
  "where did people disagree",
  "second data source",
];

export function SearchUI({
  q,
  alpha,
  who,
  src,
  hits,
  people,
  corpusSize,
}: {
  q: string;
  alpha: number;
  who: string;
  src: string;
  hits: SearchHit[];
  people: Person[];
  corpusSize: { meetings: number; segments: number };
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(q);
  const [localAlpha, setLocalAlpha] = useState(alpha);
  const inputRef = useRef<HTMLInputElement>(null);
  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  useEffect(() => setDraft(q), [q]);
  useEffect(() => setLocalAlpha(alpha), [alpha]);
  useEffect(() => inputRef.current?.focus(), []);

  function go(next: Partial<{ q: string; a: number; who: string; src: string }>) {
    const params = new URLSearchParams();
    const qq = next.q ?? draft;
    if (qq.trim()) params.set("q", qq.trim());
    const a = next.a ?? localAlpha;
    if (a !== 0.35) params.set("a", String(a));
    const w = next.who ?? who;
    if (w) params.set("who", w);
    const s = next.src ?? src;
    if (s && s !== "all") params.set("src", s);
    router.push(`/search?${params.toString()}`);
  }

  // Group by meeting so an hour-long call doesn't flood the list.
  const grouped = useMemo(() => {
    const m = new Map<string, SearchHit[]>();
    for (const h of hits) {
      const arr = m.get(h.meetingId) ?? [];
      arr.push(h);
      m.set(h.meetingId, arr);
    }
    return [...m.entries()].sort(
      (a, b) => Math.max(...b[1].map((x) => x.score)) - Math.max(...a[1].map((x) => x.score)),
    );
  }, [hits]);

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 pb-24 md:px-8">
      <PageHeader
        title="Search"
        subtitle={`Across ${corpusSize.meetings} meetings and ${corpusSize.segments.toLocaleString()} spoken lines. Transcripts and summaries, one ranked list.`}
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          go({});
        }}
        className="mb-3"
      >
        <div
          className="flex items-center gap-2.5 rounded-[var(--radius)] px-3.5"
          style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}
        >
          <span style={{ color: "var(--ink-faint)" }}>
            <Icon name="search" size={17} />
          </span>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask in your own words — it looks for meaning, not just the exact word"
            aria-label="Search all meetings"
            className="w-full bg-transparent py-3 text-[14px] outline-none"
            style={{ color: "var(--ink)" }}
          />
          {draft && (
            <button
              type="button"
              onClick={() => {
                setDraft("");
                router.push("/search");
              }}
              aria-label="Clear"
              style={{ color: "var(--ink-3)" }}
            >
              <Icon name="close" size={15} />
            </button>
          )}
        </div>
      </form>

      {/* filters */}
      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <select
          value={who}
          onChange={(e) => go({ who: e.target.value })}
          aria-label="Filter by speaker"
          className="rounded-[var(--radius-sm)] px-2.5 py-[6px] text-[12.5px]"
          style={{ background: "var(--surface)", color: "var(--ink-2)", border: "1px solid var(--line)" }}
        >
          <option value="">Anyone speaking</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <div
          className="flex items-center gap-0.5 rounded-[var(--radius-sm)] p-0.5"
          style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}
        >
          {[
            ["all", "Everything"],
            ["transcript", "Transcript"],
            ["summary", "Summaries"],
          ].map(([k, label]) => (
            <button
              key={k}
              onClick={() => go({ src: k })}
              aria-pressed={src === k}
              className="rounded-[6px] px-2 py-[4px] text-[12px] font-medium"
              style={{
                background: src === k ? "var(--surface)" : "transparent",
                color: src === k ? "var(--ink)" : "var(--ink-3)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="ml-auto flex items-center gap-2 text-[11.5px]" style={{ color: "var(--ink-3)" }}>
          <span>keyword</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={localAlpha}
            onChange={(e) => setLocalAlpha(Number(e.target.value))}
            onMouseUp={() => go({ a: localAlpha })}
            onTouchEnd={() => go({ a: localAlpha })}
            onKeyUp={() => go({ a: localAlpha })}
            className="w-[110px] accent-[var(--accent)]"
            aria-label="Blend between keyword and meaning-based ranking"
          />
          <span>meaning</span>
          <span className="tnum w-[30px]" style={{ color: "var(--ink-faint)" }}>
            {localAlpha.toFixed(2)}
          </span>
        </label>
      </div>

      {!q && (
        <div>
          <p className="mb-2 text-[12.5px]" style={{ color: "var(--ink-3)" }}>
            Try one of these — each one finds something a plain keyword search would miss:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((e) => (
              <button
                key={e}
                onClick={() => {
                  setDraft(e);
                  go({ q: e });
                }}
                className="rounded-full px-3 py-[6px] text-[12.5px] font-medium"
                style={{ background: "var(--surface)", color: "var(--ink-2)", border: "1px solid var(--line)" }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {q && !hits.length && (
        <div
          className="rounded-[var(--radius-lg)] px-6 py-12 text-center"
          style={{ background: "var(--surface)", border: "1px dashed var(--line-strong)" }}
        >
          <p className="text-[14px] font-medium">No matches for “{q}”</p>
          {/* Fathom's own reviewers complain that an empty result is
              indistinguishable from a broken tool. Saying what was searched
              costs nothing and changes what the user concludes. */}
          <p className="mt-1.5 text-[13px]" style={{ color: "var(--ink-3)" }}>
            Searched {corpusSize.segments.toLocaleString()} spoken lines and every summary across{" "}
            {corpusSize.meetings} meetings. Nothing matched, including the related words it expanded your query to.
          </p>
        </div>
      )}

      {q && hits.length > 0 && (
        <>
          <p className="mb-3 text-[12.5px]" style={{ color: "var(--ink-3)" }}>
            {hits.length} moments across {grouped.length}{" "}
            {grouped.length === 1 ? "meeting" : "meetings"}
            <span style={{ color: "var(--ink-faint)" }}>
              {" "}
              · amber = your words, blue = related words it expanded to
            </span>
          </p>

          <div className="flex flex-col gap-4">
            {grouped.map(([meetingId, group]) => (
              <section
                key={meetingId}
                className="overflow-hidden rounded-[var(--radius-lg)]"
                style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
              >
                <div
                  className="flex flex-wrap items-center gap-2 px-3.5 py-2.5"
                  style={{ borderBottom: "1px solid var(--line)", background: "var(--surface-2)" }}
                >
                  <Link
                    href={`/m/${meetingId}`}
                    className="text-[13.5px] font-semibold hover:underline"
                    style={{ color: "var(--ink)" }}
                  >
                    {group[0].meetingTitle}
                  </Link>
                  <span className="text-[11.5px] tnum" style={{ color: "var(--ink-faint)" }}>
                    {when(group[0].startedAt)}
                  </span>
                  <span className="ml-auto text-[11.5px]" style={{ color: "var(--ink-faint)" }}>
                    {group.length} {group.length === 1 ? "moment" : "moments"}
                  </span>
                </div>

                <ul>
                  {group.map((h) => {
                    const p = peopleById.get(h.speakerId);
                    return (
                      <li key={h.segmentId}>
                        <Link
                          href={`/m/${h.meetingId}?t=${Math.round(h.anchorMs)}`}
                          className="flex gap-3 px-3.5 py-2.5 transition-colors hover:bg-[var(--surface-2)]"
                        >
                          <span className="w-[46px] shrink-0 pt-[2px] text-[11.5px] tnum" style={{ color: "var(--accent-ink)" }}>
                            {clock(h.anchorMs)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="mb-0.5 flex flex-wrap items-center gap-1.5">
                              {p ? (
                                <>
                                  <Avatar person={p} size={15} />
                                  <span
                                    className="text-[11.5px] font-semibold"
                                    style={{ color: speakerVar(p.hue) }}
                                  >
                                    {p.name}
                                  </span>
                                </>
                              ) : null}
                              {h.source === "summary" && <Badge tone="accent">Summary</Badge>}
                            </span>
                            <span
                              className="block text-[13px] leading-[1.55]"
                              style={{ color: "var(--ink-2)" }}
                              dangerouslySetInnerHTML={{ __html: h.html }}
                            />
                          </span>
                          <span
                            className="hidden w-[74px] shrink-0 pt-[2px] text-right text-[10.5px] tnum sm:block"
                            style={{ color: "var(--ink-faint)" }}
                            title={`Lexical ${h.lexical.toFixed(2)} · Semantic ${h.semantic.toFixed(2)}`}
                          >
                            L {h.lexical.toFixed(2)}
                            <br />S {h.semantic.toFixed(2)}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
