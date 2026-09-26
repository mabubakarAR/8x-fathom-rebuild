import { NextResponse } from "next/server";
import { currentUserId } from "@/auth";
import { db } from "@/lib/db/client";
import { invalidateWorkspace } from "@/lib/data/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The write side of the meeting page.
//
// Everything a user changes about a meeting — ticking an action item, adding
// one, cutting a clip, fixing who said what — lands here and in Postgres.
// One route, one `op` field, because these are five small writes that share
// the same ownership check and the same cache invalidation, and five route
// files would be ceremony.
//
// Ownership is checked once, up front, against the meeting row. A meeting
// that is not yours is a 404.

type Op =
  | { op: "action.done"; id: string; done: boolean }
  | { op: "action.add"; text: string; assigneeId: string | null; anchorMs: number }
  | { op: "highlight.add"; id: string; categoryKey: string; startMs: number; endMs: number; title: string; note?: string | null }
  | { op: "highlight.remove"; id: string }
  | { op: "speaker.fix"; segmentIds: string[]; toPersonId: string }
  | { op: "speaker.rename"; personId: string; name: string };

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: meetingId } = await params;
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const sql = db();
  if (!sql) return NextResponse.json({ error: "No database" }, { status: 503 });

  const owned = await sql`select 1 from meetings where id = ${meetingId} and owner_id = ${uid}`;
  if (!owned.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: Op;
  try {
    body = (await req.json()) as Op;
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  try {
    switch (body.op) {
      case "action.done": {
        await sql`update action_items set done = ${body.done} where id = ${body.id} and meeting_id = ${meetingId}`;
        break;
      }
      case "action.add": {
        const text = String(body.text ?? "").trim().slice(0, 500);
        if (!text) return NextResponse.json({ error: "Empty" }, { status: 400 });
        const id = `ua-${meetingId}-${Date.now().toString(36)}`;
        const assignee = body.assigneeId ? await speakerRowFor(sql, meetingId, body.assigneeId) : null;
        const [{ n }] = await sql<{ n: number }[]>`select coalesce(max(idx), -1) + 1 as n from action_items where meeting_id = ${meetingId}`;
        await sql`
          insert into action_items (id, meeting_id, text, assignee_id, anchor_ms, done, user_generated, idx)
          values (${id}, ${meetingId}, ${text}, ${assignee}, ${Math.max(0, Math.round(body.anchorMs || 0))}, false, true, ${n})`;
        invalidateWorkspace(uid);
        return NextResponse.json({ ok: true, id });
      }
      case "highlight.add": {
        const hid = body.id || `uh-${meetingId}-${Date.now().toString(36)}`;
        await sql`
          insert into highlights (id, meeting_id, category_key, start_ms, end_ms, title, note, created_by)
          values (${hid}, ${meetingId}, ${body.categoryKey}, ${Math.round(body.startMs)}, ${Math.round(body.endMs)},
                  ${String(body.title ?? "").slice(0, 200)}, ${body.note ?? null}, 'you')
          on conflict (id) do nothing`;
        invalidateWorkspace(uid);
        return NextResponse.json({ ok: true, id: hid });
      }
      case "highlight.remove": {
        await sql`delete from highlights where id = ${body.id} and meeting_id = ${meetingId}`;
        break;
      }
      case "speaker.fix": {
        if (!Array.isArray(body.segmentIds) || !body.segmentIds.length) {
          return NextResponse.json({ error: "No segments" }, { status: 400 });
        }
        const to = await speakerRowFor(sql, meetingId, body.toPersonId, true);
        if (!to) return NextResponse.json({ error: "Unknown speaker" }, { status: 400 });
        await sql`update segments set speaker_id = ${to} where meeting_id = ${meetingId} and id = any(${body.segmentIds})`;
        await recountTalk(sql, meetingId);
        break;
      }
      case "speaker.rename": {
        const name = String(body.name ?? "").trim().slice(0, 80);
        if (!name) return NextResponse.json({ error: "Empty" }, { status: 400 });
        await sql`update speakers set name = ${name} where meeting_id = ${meetingId} and (id = ${body.personId} or person_key = ${body.personId})`;
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown op" }, { status: 400 });
    }
    invalidateWorkspace(uid);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}

type Sql = NonNullable<ReturnType<typeof db>>;

/**
 * The speaker row in THIS meeting for a person id, which may be a speaker
 * row id or a person_key shared across meetings. When the person is known
 * from another meeting but has no row here yet, one is created so a line can
 * be reassigned to them — that is what "the diarizer never identified them"
 * means in practice.
 */
async function speakerRowFor(sql: Sql, meetingId: string, personId: string, create = false): Promise<string | null> {
  const here = await sql<{ id: string }[]>`
    select id from speakers where meeting_id = ${meetingId} and (id = ${personId} or person_key = ${personId}) limit 1`;
  if (here[0]) return here[0].id;
  if (!create) return null;
  const elsewhere = await sql<{ name: string; hue: number; is_external: boolean; person_key: string | null; title: string | null; company: string | null; email: string | null }[]>`
    select name, hue, is_external, person_key, title, company, email from speakers
    where id = ${personId} or person_key = ${personId} limit 1`;
  const src = elsewhere[0];
  if (!src) return null;
  const [{ n }] = await sql<{ n: number }[]>`select coalesce(max(diarization_id), -1) + 1 as n from speakers where meeting_id = ${meetingId}`;
  const id = `${meetingId}-sp-${personId}`.slice(0, 200);
  await sql`
    insert into speakers (id, meeting_id, diarization_id, name, hue, is_external, person_key, title, company, email)
    values (${id}, ${meetingId}, ${n}, ${src.name}, ${src.hue}, ${src.is_external}, ${src.person_key ?? personId}, ${src.title}, ${src.company}, ${src.email})
    on conflict (id) do nothing`;
  return id;
}

/** talk_ms and word_count are denormalised on speakers; a reassignment moves them. */
async function recountTalk(sql: Sql, meetingId: string) {
  await sql`
    update speakers sp set
      talk_ms = coalesce(t.ms, 0),
      word_count = coalesce(t.words, 0)
    from (
      select s.speaker_id,
             sum(s.end_ms - s.start_ms)::int as ms,
             sum(array_length(regexp_split_to_array(s.text, '\\s+'), 1))::int as words
      from segments s where s.meeting_id = ${meetingId} group by s.speaker_id
    ) t
    where sp.id = t.speaker_id and sp.meeting_id = ${meetingId}`;
  // Speakers that lost every line drop to zero rather than keeping stale numbers.
  await sql`
    update speakers set talk_ms = 0, word_count = 0
    where meeting_id = ${meetingId}
      and id not in (select distinct speaker_id from segments where meeting_id = ${meetingId})`;
}
