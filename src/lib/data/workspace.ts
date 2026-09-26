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

// A user's workspace, read from Postgres.
//
// This replaces the compiled seed as the thing every page reads from. The
// shape is identical to what the seed produced — Meeting, Segment, Summary and
// friends — so the pages did not have to change how they think, only where
// the data comes from. The whole workspace is loaded in seven queries rather
// than seven per meeting, because the home page, search and the commitment
// tracker all want all of it at once.
//
// People are the one place the two sources genuinely differ. The seed had a
// global cast; a diarized recording has "Speaker 2". `person_key` on the
// speakers table is the bridge: when it is set, speakers across meetings
// collapse into one Person, which is what makes "Rachel's open action items"
// mean something. When it is not, each voice is its own Person, which is
// honest.

export interface Workspace {
  ownerId: string;
  meetings: Meeting[];
  segments: Segment[];
  chapters: Chapter[];
  summaries: Summary[];
  actionItems: ActionItem[];
  highlights: Highlight[];
  people: Person[];
  personById: Map<string, Person>;
  byMeeting: Map<
    string,
    {
      meeting: Meeting;
      segments: Segment[];
      chapters: Chapter[];
      summaries: Summary[];
      actionItems: ActionItem[];
      highlights: Highlight[];
    }
  >;
  /** True when at least one meeting is the imported sample. */
  hasSample: boolean;
}

export function emptyWorkspace(ownerId: string): Workspace {
  return {
    ownerId,
    meetings: [],
    segments: [],
    chapters: [],
    summaries: [],
    actionItems: [],
    highlights: [],
    people: [],
    personById: new Map(),
    byMeeting: new Map(),
    hasSample: false,
  };
}

// A cache so one page render — which may ask for the workspace from several
// components — costs one load. The TTL is deliberately tiny: on a serverless
// host a write on one instance cannot invalidate another instance's copy, and
// a user who ticks an action item and sees it un-tick on refresh has lost
// trust in the product for nothing. 300ms covers a single render; it does
// not cover a round-trip.
const cache = new Map<string, { at: number; ws: Workspace }>();
const TTL_MS = 300;
export function invalidateWorkspace(ownerId: string) {
  cache.delete(ownerId);
}

type MRow = {
  id: string; title: string; kind: string; platform: string; started_at: Date;
  duration_ms: number; gist: string; status: string; low_confidence_ratio: number;
  media_path: string | null; media_url: string | null; origin: string; sample: boolean;
};

export async function loadWorkspace(ownerId: string): Promise<Workspace> {
  const hit = cache.get(ownerId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.ws;

  const sql = db();
  if (!sql) return emptyWorkspace(ownerId);

  const mrows = await sql<MRow[]>`
    select id, title, kind, platform, started_at, duration_ms, gist, status,
           low_confidence_ratio, media_path, media_url, origin, sample
    from meetings
    where owner_id = ${ownerId} and status = 'ready'
    order by started_at desc`;

  const ws = await assemble(ownerId, mrows);
  cache.set(ownerId, { at: Date.now(), ws });
  return ws;
}

/**
 * One meeting by id, with no owner check. For share links, where the signed
 * token in the URL is the authorisation and the viewer may be nobody.
 */
export async function loadMeetingPublic(id: string): Promise<Workspace | null> {
  const sql = db();
  if (!sql) return null;
  const mrows = await sql<MRow[]>`
    select id, title, kind, platform, started_at, duration_ms, gist, status,
           low_confidence_ratio, media_path, media_url, origin, sample
    from meetings where id = ${id} and status = 'ready'`;
  if (!mrows.length) return null;
  return assemble("", mrows);
}

async function assemble(ownerId: string, mrows: MRow[]): Promise<Workspace> {
  const sql = db()!;
  if (!mrows.length) return emptyWorkspace(ownerId);
  const ids = mrows.map((m) => m.id);

  const [spRows, segRows, chRows, sumRows, secRows, bulRows, actRows, hlRows] = await Promise.all([
    sql<{ id: string; meeting_id: string; name: string; hue: number; is_external: boolean; talk_ms: number; word_count: number; person_key: string | null; title: string | null; company: string | null; email: string | null; diarization_id: number }[]>`
      select id, meeting_id, name, hue, is_external, talk_ms, word_count, person_key, title, company, email, diarization_id
      from speakers where meeting_id = any(${ids}) order by meeting_id, diarization_id`,
    sql<{ id: string; meeting_id: string; speaker_id: string; start_ms: number; end_ms: number; text: string; confidence: number; crosstalk: boolean }[]>`
      select id, meeting_id, speaker_id, start_ms, end_ms, text, confidence, crosstalk
      from segments where meeting_id = any(${ids}) order by meeting_id, idx`,
    sql<{ id: string; meeting_id: string; start_ms: number; end_ms: number; title: string; gist: string }[]>`
      select id, meeting_id, start_ms, end_ms, title, gist from chapters where meeting_id = any(${ids}) order by meeting_id, idx`,
    sql<{ id: string; meeting_id: string; template_key: string; generated_at: Date }[]>`
      select id, meeting_id, template_key, generated_at from summaries where meeting_id = any(${ids})`,
    sql<{ id: string; summary_id: string; heading: string; idx: number }[]>`
      select s.id, s.summary_id, s.heading, s.idx from summary_sections s
      join summaries m on m.id = s.summary_id where m.meeting_id = any(${ids}) order by s.idx`,
    sql<{ id: string; section_id: string; text: string; anchor_ms: number; speaker_id: string | null; idx: number }[]>`
      select b.id, b.section_id, b.text, b.anchor_ms, b.speaker_id, b.idx from summary_bullets b
      join summary_sections s on s.id = b.section_id
      join summaries m on m.id = s.summary_id where m.meeting_id = any(${ids}) order by b.idx`,
    sql<{ id: string; meeting_id: string; text: string; assignee_id: string | null; anchor_ms: number; done: boolean; user_generated: boolean; due_hint: string | null }[]>`
      select id, meeting_id, text, assignee_id, anchor_ms, done, user_generated, due_hint
      from action_items where meeting_id = any(${ids}) order by meeting_id, idx`,
    sql<{ id: string; meeting_id: string; category_key: string; start_ms: number; end_ms: number; title: string; note: string | null; created_by: string; created_at: Date }[]>`
      select id, meeting_id, category_key, start_ms, end_ms, title, note, created_by, created_at
      from highlights where meeting_id = any(${ids}) order by start_ms`,
  ]);

  // ---- people: collapse speakers that share a person_key ------------------
  const personById = new Map<string, Person>();
  const speakerToPerson = new Map<string, string>(); // speaker row id → person id
  for (const s of spRows) {
    const pid = s.person_key ?? s.id;
    speakerToPerson.set(s.id, pid);
    if (!personById.has(pid)) {
      personById.set(pid, {
        id: pid,
        name: s.name,
        email: s.email ?? "",
        title: s.title ?? "",
        external: s.is_external,
        company: s.company ?? "",
        hue: s.hue,
      });
    }
  }
  const P = (speakerId: string | null | undefined) =>
    speakerId ? (speakerToPerson.get(speakerId) ?? speakerId) : "";

  // ---- assemble per meeting ----------------------------------------------
  const spByMeeting = groupBy(spRows, (r) => r.meeting_id);
  const segByMeeting = groupBy(segRows, (r) => r.meeting_id);
  const chByMeeting = groupBy(chRows, (r) => r.meeting_id);
  const sumByMeeting = groupBy(sumRows, (r) => r.meeting_id);
  const secBySummary = groupBy(secRows, (r) => r.summary_id);
  const bulBySection = groupBy(bulRows, (r) => r.section_id);
  const actByMeeting = groupBy(actRows, (r) => r.meeting_id);
  const hlByMeeting = groupBy(hlRows, (r) => r.meeting_id);

  const byMeeting: Workspace["byMeeting"] = new Map();
  const meetings: Meeting[] = [];

  for (const m of mrows) {
    const sps = spByMeeting.get(m.id) ?? [];
    const meeting: Meeting = {
      id: m.id,
      title: m.title,
      kind: (m.kind as Meeting["kind"]) ?? "planning",
      platform: (m.platform as Meeting["platform"]) ?? "zoom",
      startedAt: new Date(m.started_at).toISOString(),
      durationMs: m.duration_ms,
      gist: m.gist,
      hasExternal: sps.some((s) => s.is_external),
      lowConfidenceRatio: m.low_confidence_ratio ?? 0,
      recordedById: P(sps[0]?.id),
      participants: sps.map((s) => ({
        personId: P(s.id),
        talkMs: s.talk_ms,
        longestMonologueMs: 0,
        wordCount: s.word_count,
        questionsAsked: 0,
        attended: true,
      })),
      mediaUrl: m.media_url ?? m.media_path ?? null,
      origin: m.origin,
      sample: m.sample,
    };

    const segments: Segment[] = (segByMeeting.get(m.id) ?? []).map((s) => ({
      id: s.id, meetingId: m.id, speakerId: P(s.speaker_id),
      startMs: s.start_ms, endMs: s.end_ms, text: s.text,
      confidence: s.confidence, crosstalk: s.crosstalk || undefined,
    }));
    const chapters: Chapter[] = (chByMeeting.get(m.id) ?? []).map((c) => ({
      id: c.id, meetingId: m.id, startMs: c.start_ms, endMs: c.end_ms, title: c.title, gist: c.gist,
    }));
    const summaries: Summary[] = (sumByMeeting.get(m.id) ?? []).map((s) => ({
      id: s.id,
      meetingId: m.id,
      templateKey: s.template_key as Summary["templateKey"],
      generatedAt: new Date(s.generated_at).toISOString(),
      sections: (secBySummary.get(s.id) ?? []).map((sec) => ({
        id: sec.id,
        heading: sec.heading,
        bullets: (bulBySection.get(sec.id) ?? []).map((b) => ({
          id: b.id, text: b.text, anchorMs: b.anchor_ms, speakerId: b.speaker_id ? P(b.speaker_id) : undefined,
        })),
      })),
    }));
    const actionItems: ActionItem[] = (actByMeeting.get(m.id) ?? []).map((a) => ({
      id: a.id, meetingId: m.id, text: a.text, assigneeId: a.assignee_id ? P(a.assignee_id) : null,
      anchorMs: a.anchor_ms, done: a.done, userGenerated: a.user_generated, dueHint: a.due_hint ?? undefined,
    }));
    const highlights: Highlight[] = (hlByMeeting.get(m.id) ?? []).map((h) => ({
      id: h.id, meetingId: m.id, categoryKey: h.category_key, startMs: h.start_ms, endMs: h.end_ms,
      title: h.title, note: h.note ?? undefined, createdById: h.created_by, createdAt: new Date(h.created_at).toISOString(),
    }));

    meetings.push(meeting);
    byMeeting.set(m.id, { meeting, segments, chapters, summaries, actionItems, highlights });
  }

  const ws: Workspace = {
    ownerId,
    meetings,
    segments: meetings.flatMap((m) => byMeeting.get(m.id)!.segments),
    chapters: meetings.flatMap((m) => byMeeting.get(m.id)!.chapters),
    summaries: meetings.flatMap((m) => byMeeting.get(m.id)!.summaries),
    actionItems: meetings.flatMap((m) => byMeeting.get(m.id)!.actionItems),
    highlights: meetings.flatMap((m) => byMeeting.get(m.id)!.highlights),
    people: [...personById.values()],
    personById,
    byMeeting,
    hasSample: mrows.some((m) => m.sample),
  };
  return ws;
}

function groupBy<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    const arr = out.get(k);
    if (arr) arr.push(r);
    else out.set(k, [r]);
  }
  return out;
}
