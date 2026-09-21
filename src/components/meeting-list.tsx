"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { bucketOf, duration, pluralise, timeOf } from "@/lib/format";
import { Avatar, AvatarStack, Icon } from "./ui";
import { CallThumb } from "./call-thumb";
import type { ThumbSlice } from "@/lib/thumb";
import { Upcoming } from "./upcoming";
import type { UpcomingMeeting } from "@/lib/seed/upcoming";
import type { Person } from "@/lib/types";

export interface MeetingRow {
  id: string;
  /** Where this row links. Seeded meetings live at /m, saved calls at
   *  /imported — the row knows, so the card does not have to guess. */
  href?: string;
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
  /** Precomputed waveform shape for the thumbnail. */
  slices: ThumbSlice[];
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
  hero,
}: {
  rows: MeetingRow[];
  upcoming: UpcomingMeeting[];
  people: Person[];
  /** The import surface. Rendered above the demo corpus on the home page. */
  hero?: React.ReactNode;
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
      {hero}

      {/* The demo corpus, labelled as what it is.
          Nine authored meetings exist so the interface — chapters, the speaker
          minimap, repair, search across calls — is reviewable in thirty
          seconds without anyone uploading an hour of audio first. Calling them
          "Meetings" and leaving the reader to work it out was the single most
          misleading thing about the first version of this page. */}
      <div
        className="mb-4 flex flex-wrap items-end justify-between gap-3 rounded-[var(--radius-lg)] px-4 py-3.5"
        style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}
      >
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]" style={{ color: "var(--ink)" }}>
            Demo workspace{" "}
            <span className="text-[12px] font-normal" style={{ color: "var(--ink-faint)" }}>
              — fiction, on purpose
            </span>
          </h2>
          <p className="mt-1 max-w-[62ch] text-[12.5px] leading-[1.55]" style={{ color: "var(--ink-3)" }}>
            {rows.length} authored meetings, {totalMin} minutes, {pluralise(openActions, "open action item")}.
            Nothing here was recorded and no model wrote it — it exists so the parts that are hard to
            show on a two-minute clip (an eight-person hour, crosstalk, search across calls) are
            there to poke at.{" "}
            <Link href="/m/m-roadmap-lock" className="underline" style={{ color: "var(--accent-ink)" }}>
              Start with the 54-minute one
            </Link>
            .
          </p>
        </div>
        <Link
          href="/about"
          className="shrink-0 text-[12.5px] font-medium underline"
          style={{ color: "var(--accent-ink)" }}
        >
          What&rsquo;s real vs simulated
        </Link>
      </div>

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
          <div className="stagger grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {g.rows.map((r, i) => (
              <div key={r.id} style={{ "--i": i } as React.CSSProperties}>
                <Card r={r} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Card({ r }: { r: MeetingRow }) {
  const spoke = r.participants.filter((p) => p.attended);
  const shaky = r.lowConfidenceRatio > 0.04;

  return (
    // content-visibility lets the browser skip laying out and painting a
    // card that is off-screen entirely. Each one holds a 44-bar waveform, a
    // stack of avatars and a few badges, so twelve of them is a few thousand
    // boxes the browser was styling on every scroll. The intrinsic size is
    // supplied so the scrollbar doesn't jump as cards enter and leave.
    <Link
      href={r.href ?? `/m/${r.id}`}
      className="group block"
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 280px" }}
    >
      {/* The tile.
          Hover does three things at once, which is what makes it feel like a
          physical object rather than a link: the card lifts, a scrim darkens the artwork
          so the play control has something to sit on, and the control fades
          up. One of those alone reads as a hover state; all three read as an
          object responding. */}
      <div
        className="lift-hover relative overflow-hidden rounded-[var(--radius)]"
        style={{ boxShadow: "var(--lift), var(--shadow-md)" }}
      >
        <CallThumb
          id={r.id}
          slices={r.slices}
          duration={duration(r.durationMs)}
          live={r.isLive}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: "linear-gradient(to top, oklch(0% 0 0 / .55), oklch(0% 0 0 / .1) 55%, transparent)" }}
        />
        <div
          className="pointer-events-none absolute inset-0 grid place-items-center opacity-0 transition-all duration-300 group-hover:opacity-100"
        >
          <span
            className="grid h-11 w-11 translate-y-1.5 place-items-center rounded-full transition-transform duration-300 group-hover:translate-y-0"
            style={{
              background: "oklch(100% 0 0 / .94)",
              color: "oklch(12% 0 0)",
              boxShadow: "0 8px 26px oklch(0% 0 0 / .45)",
            }}
          >
            <Icon name="play" size={16} />
          </span>
        </div>
      </div>

      <div className="mt-2.5">
        <div className="flex items-start gap-2">
          <h3
            className="min-w-0 flex-1 text-[14.5px] leading-[1.32] font-semibold tracking-[-0.012em] transition-colors group-hover:text-[var(--accent)]"
            style={{ color: "var(--ink)" }}
          >
            {r.title}
          </h3>
        </div>

        <div
          className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px]"
          style={{ color: "var(--ink-faint)" }}
        >
          <span className="tnum">{timeOf(r.startedAt)}</span>
          {KIND_LABEL[r.kind] && (
            <>
              <span aria-hidden>·</span>
              <span>{KIND_LABEL[r.kind]}</span>
            </>
          )}
          {r.hasExternal && (
            <>
              <span aria-hidden>·</span>
              <span style={{ color: "var(--violet)" }}>External</span>
            </>
          )}
          {shaky && (
            <>
              <span aria-hidden>·</span>
              <span
                style={{ color: "var(--warn-ink)" }}
                title={`${Math.round(r.lowConfidenceRatio * 100)}% of lines are low-confidence`}
              >
                Needs review
              </span>
            </>
          )}
        </div>

        <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-[1.5]" style={{ color: "var(--ink-3)" }}>
          {r.gist}
        </p>

        <div className="mt-2 flex items-center gap-2.5">
          <AvatarStack people={r.participants as unknown as Person[]} max={4} size={19} />
          {spoke.length > 0 && (
            <span className="text-[11px]" style={{ color: "var(--ink-faint)" }}>
              {spoke.length} spoke
            </span>
          )}
          {r.openActionCount > 0 && (
            <span
              className="ml-auto flex items-center gap-1 text-[11px] tnum"
              style={{ color: "var(--ink-3)" }}
            >
              <Icon name="check" size={11} /> {r.openActionCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export { Avatar };
