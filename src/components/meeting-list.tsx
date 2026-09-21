"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { bucketOf, duration, pluralise, timeOf, when } from "@/lib/format";
import { Avatar, AvatarStack, Badge, Icon, TalkBar } from "./ui";
import { PageHeader } from "./page-header";
import { Upcoming } from "./upcoming";
import type { UpcomingMeeting } from "@/lib/seed/upcoming";
import type { Person } from "@/lib/types";

export interface MeetingRow {
  id: string;
  title: string;
  kind: string;
  platform: string;
  startedAt: string;
  durationMs: number;
  gist: string;
  hasExternal: boolean;
  lowConfidenceRatio: number;
  actionCount: number;
  openActionCount: number;
  highlightCount: number;
  chapterCount: number;
  isLive?: boolean;
  status?: string;
  participants: (Pick<Person, "id" | "name" | "title" | "company" | "external" | "hue"> & {
    talkMs: number;
    attended: boolean;
  })[];
}

type Filter = "all" | "external" | "internal" | "mine";

const KIND_LABEL: Record<string, string> = {
  planning: "Planning",
  customer: "Customer",
  discovery: "Discovery",
  sales: "Sales",
  "one-on-one": "1:1",
  standup: "Standup",
  retro: "Retro",
  interview: "Interview",
  "all-hands": "All hands",
};

const ME = "p-abubakar";

export function MeetingList({
  rows,
  upcoming,
  people,
}: {
  rows: MeetingRow[];
  upcoming: UpcomingMeeting[];
  people: Person[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "external" && !r.hasExternal) return false;
      if (filter === "internal" && r.hasExternal) return false;
      if (filter === "mine" && !r.participants.some((p) => p.id === ME)) return false;
      if (!needle) return true;
      return (
        r.title.toLowerCase().includes(needle) ||
        r.gist.toLowerCase().includes(needle) ||
        r.participants.some((p) => p.name.toLowerCase().includes(needle))
      );
    });
  }, [rows, filter, q]);

  const groups = useMemo(() => {
    const out: { bucket: string; rows: MeetingRow[] }[] = [];
    for (const r of filtered) {
      const b = bucketOf(r.startedAt);
      const last = out[out.length - 1];
      if (last && last.bucket === b) last.rows.push(r);
      else out.push({ bucket: b, rows: [r] });
    }
    return out;
  }, [filtered]);

  const totalMin = Math.round(rows.reduce((a, r) => a + r.durationMs, 0) / 60000);
  const openActions = rows.reduce((a, r) => a + r.openActionCount, 0);

  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 pb-24 md:px-8">
      <PageHeader
        title="Meetings"
        subtitle={`${rows.length} recordings · ${totalMin} minutes captured · ${pluralise(openActions, "open action item")}`}
        actions={
          <Link
            href="/import"
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3.5 py-[8px] text-[13px] font-semibold"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            <Icon name="plus" size={14} /> Import a transcript
          </Link>
        }
      />

      <Upcoming upcoming={upcoming} people={people} />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div
          className="flex min-w-[220px] flex-1 items-center gap-2 rounded-[var(--radius)] px-3"
          style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
        >
          <span style={{ color: "var(--ink-faint)" }}>
            <Icon name="search" />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by title, person or summary…"
            aria-label="Filter meetings"
            className="w-full bg-transparent py-2 text-[13.5px] outline-none"
            style={{ color: "var(--ink)" }}
          />
          {q && (
            <button onClick={() => setQ("")} aria-label="Clear filter" style={{ color: "var(--ink-3)" }}>
              <Icon name="close" size={14} />
            </button>
          )}
        </div>

        <div
          className="flex items-center gap-0.5 rounded-[var(--radius)] p-0.5"
          style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}
        >
          {(["all", "external", "internal", "mine"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className="rounded-[6px] px-2.5 py-[5px] text-[12.5px] font-medium capitalize transition-colors"
              style={{
                background: filter === f ? "var(--surface)" : "transparent",
                color: filter === f ? "var(--ink)" : "var(--ink-3)",
                boxShadow: filter === f ? "var(--shadow-sm)" : undefined,
              }}
            >
              {f === "mine" ? "My calls" : f}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 && (
        <div
          className="rounded-[var(--radius-lg)] px-6 py-14 text-center"
          style={{ background: "var(--surface)", border: "1px dashed var(--line-strong)" }}
        >
          <div className="text-[14px] font-medium">Nothing matches that</div>
          <p className="mt-1 text-[13px]" style={{ color: "var(--ink-3)" }}>
            Try a different filter, or{" "}
            <Link href="/search" className="underline" style={{ color: "var(--accent-ink)" }}>
              search inside the transcripts
            </Link>{" "}
            instead — this box only looks at titles and summaries.
          </p>
        </div>
      )}

      {groups.map((g) => (
        <section key={g.bucket} className="mb-7">
          <h2
            className="mb-2 px-1 text-[11px] font-semibold tracking-[0.07em] uppercase"
            style={{ color: "var(--ink-3)" }}
          >
            {g.bucket}
          </h2>
          <div className="flex flex-col gap-1.5">
            {g.rows.map((r) => (
              <Row key={r.id} r={r} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Row({ r }: { r: MeetingRow }) {
  const spoke = r.participants.filter((p) => p.attended);
  const total = spoke.reduce((a, p) => a + p.talkMs, 0);
  const big = r.participants.length >= 6;
  const shaky = r.lowConfidenceRatio > 0.04;

  return (
    <Link
      href={`/m/${r.id}`}
      className="group block rounded-[var(--radius-lg)] p-3.5 transition-[background,box-shadow,transform] hover:shadow-[var(--shadow-md)]"
      style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
    >
      <div className="flex items-start gap-3.5">
        <div className="hidden w-[76px] shrink-0 pt-0.5 sm:block">
          <div className="text-[12.5px] font-semibold tnum" style={{ color: "var(--ink-2)" }}>
            {when(r.startedAt).replace(/,.*/, "")}
          </div>
          <div className="text-[11.5px] tnum" style={{ color: "var(--ink-faint)" }}>
            {timeOf(r.startedAt)}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3
              className="text-[14.5px] font-semibold tracking-[-0.005em] transition-colors group-hover:text-[var(--accent-ink)]"
              style={{ color: "var(--ink)" }}
            >
              {r.title}
            </h3>
            {KIND_LABEL[r.kind] && <Badge>{KIND_LABEL[r.kind]}</Badge>}
            {r.isLive && (
              <Badge tone="ok" title="Uploaded, transcribed and analysed for real">
                Real recording
              </Badge>
            )}
            {r.status && r.status !== "ready" && (
              <Badge tone="warn">{r.status}</Badge>
            )}
            {r.hasExternal && <Badge tone="violet">External</Badge>}
            {big && <Badge tone="accent">{r.participants.length} people</Badge>}
            {shaky && (
              <Badge tone="warn" title={`${Math.round(r.lowConfidenceRatio * 100)}% of lines are low-confidence — crosstalk and jargon`}>
                <Icon name="warn" size={11} /> Needs review
              </Badge>
            )}
          </div>

          {/* The one-line gist. Fathom's web list is title + icons only; this is
              the single highest-value thing to add to a list row. */}
          <p
            className="mt-1 line-clamp-2 text-[13px] leading-[1.5]"
            style={{ color: "var(--ink-2)" }}
          >
            {r.gist}
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
            <AvatarStack people={r.participants as unknown as Person[]} max={6} size={22} />

            <span className="flex items-center gap-1 text-[12px] tnum" style={{ color: "var(--ink-3)" }}>
              {duration(r.durationMs)}
            </span>

            {r.chapterCount > 2 && (
              <span className="flex items-center gap-1 text-[12px]" style={{ color: "var(--ink-3)" }}>
                <Icon name="chapter" size={13} /> {r.chapterCount} chapters
              </span>
            )}
            {r.openActionCount > 0 && (
              <span className="flex items-center gap-1 text-[12px]" style={{ color: "var(--ink-3)" }}>
                <Icon name="check" size={13} /> {r.openActionCount} open
              </span>
            )}
            {r.highlightCount > 0 && (
              <span className="flex items-center gap-1 text-[12px]" style={{ color: "var(--ink-3)" }}>
                <Icon name="clip" size={13} /> {r.highlightCount}
              </span>
            )}
          </div>

          {big && total > 0 && (
            <div className="mt-2.5">
              <TalkBar
                rows={spoke.map((p) => ({ person: p as unknown as Person, ms: p.talkMs }))}
                totalMs={total}
              />
              <div className="mt-1 text-[11px]" style={{ color: "var(--ink-faint)" }}>
                {spoke[0]?.name.split(" ")[0]} spoke {Math.round((spoke[0].talkMs / total) * 100)}% of
                the time
                {r.participants.some((p) => !p.attended) &&
                  ` · ${r.participants.filter((p) => !p.attended).length} attended without speaking`}
              </div>
            </div>
          )}
        </div>

        <span
          className="hidden self-center opacity-0 transition-opacity group-hover:opacity-100 sm:block"
          style={{ color: "var(--ink-faint)" }}
        >
          <Icon name="chevron" />
        </span>
      </div>
    </Link>
  );
}

export { Avatar };
