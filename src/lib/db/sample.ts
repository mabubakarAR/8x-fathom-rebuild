import "server-only";
import { db } from "@/lib/db/client";
import { buildAll } from "@/lib/seed";
import { PERSON_BY_ID } from "@/lib/seed/cast";
import { sliceMeeting } from "@/lib/thumb";
import { invalidateWorkspace } from "@/lib/data/workspace";

// The sample workspace.
//
// Nine authored meetings — a quarter of one team's calls, with threads
// running between them — so a reviewer who has just signed in has something
// to search, ask and compare before they have recorded anything. They were a
// compiled fixture; now they are rows like any other meeting, owned by the
// user who imported them and marked `sample` so they can be removed in one
// click. Nothing reads the fixture directly any more.
//
// Ids are suffixed with the owner, because two users importing the same
// sample must not collide on a global primary key.

function ownerSuffix(ownerId: string): string {
  let h = 2166136261;
  for (let i = 0; i < ownerId.length; i++) {
    h ^= ownerId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).slice(0, 6);
}

export async function importSample(ownerId: string): Promise<{ ok: true; meetings: number } | { ok: false; reason: string }> {
  const sql = db();
  if (!sql) return { ok: false, reason: "No database is connected" };

  const sfx = ownerSuffix(ownerId);
  const built = buildAll();
  const mid = (id: string) => `${id}-${sfx}`;
  const rid = (id: string) => `${id}-${sfx}`; // any child row id

  try {
    await sql.begin(async (tx) => {
      // Re-import replaces the previous sample wholesale.
      await tx`delete from meetings where owner_id = ${ownerId} and sample = true`;

      for (const b of built) {
        const m = b.meeting;
        const id = mid(m.id);
        const people = m.participants
          .map((p) => PERSON_BY_ID.get(p.personId))
          .filter((p): p is NonNullable<typeof p> => Boolean(p));

        await tx`
          insert into meetings (
            id, title, kind, platform, started_at, duration_ms, gist, status,
            origin, transcript_source, low_confidence_ratio, shape, owner_id, sample
          ) values (
            ${id}, ${m.title}, ${m.kind}, ${m.platform}, ${m.startedAt}, ${Math.round(m.durationMs)},
            ${m.gist}, 'ready', 'sample', 'authored', ${m.lowConfidenceRatio},
            ${JSON.stringify(sliceMeeting(
              b.segments.map((s) => ({ startMs: s.startMs, endMs: s.endMs, crosstalk: s.crosstalk, hue: PERSON_BY_ID.get(s.speakerId)?.hue })),
              m.durationMs,
            ))},
            ${ownerId}, true
          )`;

        // One speaker row per participant. person_key is the seed person id,
        // which is what lets the same person be one person across meetings.
        const spId = (personId: string) => `${id}-sp-${personId}`;
        if (people.length) {
          await tx`insert into speakers ${tx(
            m.participants
              .filter((p) => PERSON_BY_ID.has(p.personId))
              .map((p, i) => {
                const person = PERSON_BY_ID.get(p.personId)!;
                return {
                  id: spId(p.personId),
                  meeting_id: id,
                  diarization_id: i,
                  name: person.name,
                  hue: person.hue,
                  talk_ms: Math.round(p.talkMs),
                  word_count: p.wordCount,
                  is_external: person.external,
                  person_key: person.id,
                  title: person.title,
                  company: person.company,
                  email: person.email,
                };
              }),
          )}`;
        }

        if (b.segments.length) {
          await tx`insert into segments ${tx(
            b.segments.map((s, i) => ({
              id: rid(s.id),
              meeting_id: id,
              speaker_id: spId(s.speakerId),
              start_ms: Math.round(s.startMs),
              end_ms: Math.round(s.endMs),
              text: s.text,
              confidence: s.confidence,
              crosstalk: Boolean(s.crosstalk),
              idx: i,
            })),
          )}`;
        }

        if (b.chapters.length) {
          await tx`insert into chapters ${tx(
            b.chapters.map((c, i) => ({
              id: rid(c.id), meeting_id: id, start_ms: Math.round(c.startMs), end_ms: Math.round(c.endMs),
              title: c.title, gist: c.gist, idx: i,
            })),
          )}`;
        }

        for (const s of b.summaries) {
          await tx`insert into summaries (id, meeting_id, template_key, generated_at, model)
                   values (${rid(s.id)}, ${id}, ${s.templateKey}, ${s.generatedAt}, 'authored')`;
          for (const [i, sec] of s.sections.entries()) {
            await tx`insert into summary_sections (id, summary_id, heading, idx)
                     values (${rid(sec.id)}, ${rid(s.id)}, ${sec.heading}, ${i})`;
            if (sec.bullets.length) {
              await tx`insert into summary_bullets ${tx(
                sec.bullets.map((bl, j) => ({
                  id: rid(bl.id), section_id: rid(sec.id), text: bl.text, anchor_ms: Math.round(bl.anchorMs),
                  segment_id: null, speaker_id: bl.speakerId ? spId(bl.speakerId) : null, idx: j,
                })),
              )}`;
            }
          }
        }

        if (b.actionItems.length) {
          await tx`insert into action_items ${tx(
            b.actionItems.map((a, i) => ({
              id: rid(a.id), meeting_id: id, text: a.text,
              assignee_id: a.assigneeId ? spId(a.assigneeId) : null,
              anchor_ms: Math.round(a.anchorMs), segment_id: null, done: a.done,
              user_generated: a.userGenerated, due_hint: a.dueHint ?? null, idx: i,
            })),
          )}`;
        }

        if (b.highlights.length) {
          await tx`insert into highlights ${tx(
            b.highlights.map((h) => ({
              id: rid(h.id), meeting_id: id, category_key: h.categoryKey,
              start_ms: Math.round(h.startMs), end_ms: Math.round(h.endMs), title: h.title,
              note: h.note ?? null, created_by: h.createdById, created_at: h.createdAt,
            })),
          )}`;
        }
      }
    });
    invalidateWorkspace(ownerId);
    return { ok: true, meetings: built.length };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

export async function removeSample(ownerId: string): Promise<number> {
  const sql = db();
  if (!sql) return 0;
  const rows = await sql`delete from meetings where owner_id = ${ownerId} and sample = true returning id`;
  invalidateWorkspace(ownerId);
  return rows.length;
}
