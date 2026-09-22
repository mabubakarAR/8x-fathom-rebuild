import "server-only";
import { db } from "@/lib/db/client";
import type {
  ActionItem,
  Chapter,
  Highlight,
  Meeting,
  Person,
  Segment,
  Summary,
} from "@/lib/types";

// Reading real meetings back out of Postgres, in exactly the shapes the UI
// already speaks. That is the whole point of having kept the domain model
// separate from the seed: the meeting page does not know or care whether a
// meeting was written by hand or produced by Deepgram and Claude.
//
// Uploaded meetings and seeded meetings appear in the same list, and the only
// difference the user sees is a badge saying which is which.

export interface LiveBundle {
  meeting: Meeting;
  segments: Segment[];
  chapters: Chapter[];
  summaries: Summary[];
  actionItems: ActionItem[];
  highlights: Highlight[];
  people: Person[];
  mediaUrl: string | null;
  status: string;
  error: string | null;
}

interface MeetingRow {
  id: string;
  title: string;
  kind: string;
  platform: string;
  started_at: Date;
  duration_ms: number;
  gist: string;
  status: string;
  error: string | null;
  media_path: string | null;
  low_confidence_ratio: number;
}

function toPerson(r: {
  id: string;
  name: string;
  hue: number;
  is_external: boolean;
}): Person {
  return {
    id: r.id,
    name: r.name,
    email: "",
    title: "",
    external: r.is_external,
    company: "",
    hue: r.hue,
  };
}

/** Summary rows for the list page. Cheap — no segments, no bullets. */
export async function listLiveMeetings(): Promise<
  (Meeting & { status: string; isLive: true })[]
> {
  const sql = db();
  if (!sql) return [];
  try {
    // Only the ones still in flight.
    //
    // This used to return every row in `meetings`, which is also exactly what
    // listCalls() returns — so a recording showed up twice on the home page,
    // once as the rich row with its waveform and counts and once as this
    // barer one. Two functions written weeks apart for what turned out to be
    // the same table.
    //
    // The division now matches what each is for: listCalls owns finished
    // calls, and this owns the ones that still need a "processing" state.
    const rows = await sql<(MeetingRow & { speaker_count: number })[]>`
      select m.*, (select count(*)::int from speakers s where s.meeting_id = m.id) as speaker_count
      from meetings m
      where m.status is distinct from 'ready'
      order by m.created_at desc
      limit 50`;

    const out: (Meeting & { status: string; isLive: true })[] = [];
    for (const r of rows) {
      const speakers = await sql<
        { id: string; name: string; hue: number; is_external: boolean; talk_ms: number; word_count: number }[]
      >`select id, name, hue, is_external, talk_ms, word_count from speakers where meeting_id = ${r.id} order by talk_ms desc`;

      out.push({
        id: r.id,
        title: r.title,
        kind: (r.kind as Meeting["kind"]) ?? "planning",
        platform: "zoom",
        startedAt: new Date(r.started_at).toISOString(),
        durationMs: r.duration_ms,
        gist: r.gist || (r.status === "ready" ? "" : `Processing — ${r.status}…`),
        hasExternal: speakers.some((s) => s.is_external),
        lowConfidenceRatio: r.low_confidence_ratio ?? 0,
        participants: speakers.map((s) => ({
          personId: s.id,
          talkMs: s.talk_ms,
          longestMonologueMs: 0,
          wordCount: s.word_count,
          questionsAsked: 0,
          attended: true,
        })),
        recordedById: speakers[0]?.id ?? "",
        status: r.status,
        isLive: true,
      });
    }
    return out;
  } catch {
    // A database that is down must not take the seeded workspace with it.
    return [];
  }
}

export async function getLiveMeeting(id: string): Promise<LiveBundle | null> {
  const sql = db();
  if (!sql) return null;

  try {
    const mrows = await sql<MeetingRow[]>`select * from meetings where id = ${id}`;
    const m = mrows[0];
    if (!m) return null;

    const [speakerRows, segRows, chapRows, sumRows, actRows, hlRows] = await Promise.all([
      sql<{ id: string; name: string; hue: number; is_external: boolean; talk_ms: number; word_count: number }[]>`
        select id, name, hue, is_external, talk_ms, word_count from speakers where meeting_id = ${id} order by diarization_id`,
      sql<{ id: string; speaker_id: string; start_ms: number; end_ms: number; text: string; confidence: number; crosstalk: boolean }[]>`
        select id, speaker_id, start_ms, end_ms, text, confidence, crosstalk from segments where meeting_id = ${id} order by idx`,
      sql<{ id: string; start_ms: number; end_ms: number; title: string; gist: string }[]>`
        select id, start_ms, end_ms, title, gist from chapters where meeting_id = ${id} order by idx`,
      sql<{ id: string; template_key: string; generated_at: Date }[]>`
        select id, template_key, generated_at from summaries where meeting_id = ${id}`,
      sql<{ id: string; text: string; assignee_id: string | null; anchor_ms: number; done: boolean; user_generated: boolean; due_hint: string | null }[]>`
        select id, text, assignee_id, anchor_ms, done, user_generated, due_hint from action_items where meeting_id = ${id} order by idx`,
      sql<{ id: string; category_key: string; start_ms: number; end_ms: number; title: string; note: string | null; created_by: string; created_at: Date }[]>`
        select id, category_key, start_ms, end_ms, title, note, created_by, created_at from highlights where meeting_id = ${id} order by start_ms`,
    ]);

    const summaries: Summary[] = [];
    for (const s of sumRows) {
      const secs = await sql<{ id: string; heading: string }[]>`
        select id, heading from summary_sections where summary_id = ${s.id} order by idx`;
      const sections = [];
      for (const sec of secs) {
        const bs = await sql<{ id: string; text: string; anchor_ms: number; speaker_id: string | null }[]>`
          select id, text, anchor_ms, speaker_id from summary_bullets where section_id = ${sec.id} order by idx`;
        sections.push({
          id: sec.id,
          heading: sec.heading,
          bullets: bs.map((b) => ({
            id: b.id,
            text: b.text,
            anchorMs: b.anchor_ms,
            speakerId: b.speaker_id ?? undefined,
          })),
        });
      }
      summaries.push({
        id: s.id,
        meetingId: id,
        templateKey: s.template_key as Summary["templateKey"],
        generatedAt: new Date(s.generated_at).toISOString(),
        sections,
      });
    }

    const people = speakerRows.map(toPerson);

    return {
      meeting: {
        id: m.id,
        title: m.title,
        kind: (m.kind as Meeting["kind"]) ?? "planning",
        platform: "zoom",
        startedAt: new Date(m.started_at).toISOString(),
        durationMs: m.duration_ms,
        gist: m.gist,
        hasExternal: speakerRows.some((s) => s.is_external),
        lowConfidenceRatio: m.low_confidence_ratio ?? 0,
        recordedById: speakerRows[0]?.id ?? "",
        participants: speakerRows.map((s) => ({
          personId: s.id,
          talkMs: s.talk_ms,
          longestMonologueMs: 0,
          wordCount: s.word_count,
          questionsAsked: 0,
          attended: true,
        })),
      },
      segments: segRows.map((s) => ({
        id: s.id,
        meetingId: id,
        speakerId: s.speaker_id,
        startMs: s.start_ms,
        endMs: s.end_ms,
        text: s.text,
        confidence: s.confidence,
        crosstalk: s.crosstalk || undefined,
      })),
      chapters: chapRows.map((c) => ({
        id: c.id,
        meetingId: id,
        startMs: c.start_ms,
        endMs: c.end_ms,
        title: c.title,
        gist: c.gist,
      })),
      summaries,
      actionItems: actRows.map((a) => ({
        id: a.id,
        meetingId: id,
        text: a.text,
        assigneeId: a.assignee_id,
        anchorMs: a.anchor_ms,
        done: a.done,
        userGenerated: a.user_generated,
        dueHint: a.due_hint ?? undefined,
      })),
      highlights: hlRows.map((h) => ({
        id: h.id,
        meetingId: id,
        categoryKey: h.category_key,
        startMs: h.start_ms,
        endMs: h.end_ms,
        title: h.title,
        note: h.note ?? undefined,
        createdById: h.created_by,
        createdAt: new Date(h.created_at).toISOString(),
      })),
      people,
      // media_path now holds the URL itself — a CDN blob URL, or this
      // app's own /audio route when the bytes are in Postgres.
      mediaUrl: m.media_path,
      status: m.status,
      error: m.error,
    };
  } catch {
    return null;
  }
}
