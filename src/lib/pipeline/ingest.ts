import "server-only";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db/client";
import { transcribe, isCrosstalk, type RawSegment } from "./transcribe";
import { analyse, TEMPLATE_SECTIONS } from "./analyse";

// The pipeline, end to end.
//
//   upload → store media → transcribe (Deepgram) → analyse (Claude) → persist
//
// Split into two server steps rather than one, because a serverless function
// gets 60 seconds and transcription plus analysis of a real recording does not
// reliably fit in that. The client drives them in sequence and watches the
// status column, which has the useful side effect of making the pipeline
// visible instead of hiding it behind one long spinner.
//
// Status values: queued → transcribing → analysing → ready | failed
// `error` carries the actual message, because a pipeline that only says
// "failed" is one nobody can debug.

const BUCKET = process.env.SUPABASE_BUCKET || "recordings";
const CONFIDENCE_THRESHOLD = 0.82;

export function storageConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function storage() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase storage is not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function ensureBucket(): Promise<void> {
  const s = storage();
  const { data } = await s.storage.listBuckets();
  if (data?.some((b) => b.name === BUCKET)) return;
  await s.storage.createBucket(BUCKET, { public: true, fileSizeLimit: "200MB" });
}

export async function uploadMedia(
  meetingId: string,
  bytes: ArrayBuffer,
  filename: string,
  mime: string,
): Promise<string> {
  await ensureBucket();
  const ext =
    filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${meetingId}/source.${ext}`;
  const { error } = await storage()
    .storage.from(BUCKET)
    .upload(path, bytes, { contentType: mime, upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return path;
}

export function publicMediaUrl(path: string | null): string | null {
  if (!path || !storageConfigured()) return null;
  return storage().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function downloadMedia(path: string): Promise<ArrayBuffer> {
  const { data, error } = await storage().storage.from(BUCKET).download(path);
  if (error || !data) throw new Error(`Storage download failed: ${error?.message}`);
  return data.arrayBuffer();
}

export async function setStatus(id: string, status: string, error?: string) {
  const sql = db();
  if (!sql) return;
  await sql`update meetings set status = ${status}, error = ${error ?? null} where id = ${id}`;
}

const hueFor = (label: number) => label % 15;
const segIdOf = (m: string, i: number) => `${m}-s${i}`;
const spIdOf = (m: string, label: number) => `${m}-sp${label}`;

// ---------------------------------------------------------------------------
// Step 1 — transcription
// ---------------------------------------------------------------------------

export async function runTranscription(meetingId: string): Promise<{ segments: number }> {
  const sql = db();
  if (!sql) throw new Error("DATABASE_URL is not set");

  const rows = await sql<{ media_path: string | null; media_mime: string | null }[]>`
    select media_path, media_mime from meetings where id = ${meetingId}`;
  const row = rows[0];
  if (!row?.media_path) throw new Error("No media stored for this meeting");

  await setStatus(meetingId, "transcribing");
  const bytes = await downloadMedia(row.media_path);
  const t = await transcribe(bytes, row.media_mime || "audio/mpeg");

  const labels = [...new Set(t.segments.map((s) => s.speakerLabel))].sort((a, b) => a - b);
  const talk = new Map<number, number>();
  const words = new Map<number, number>();
  for (const s of t.segments) {
    talk.set(s.speakerLabel, (talk.get(s.speakerLabel) ?? 0) + (s.endMs - s.startMs));
    words.set(
      s.speakerLabel,
      (words.get(s.speakerLabel) ?? 0) + s.text.split(/\s+/).filter(Boolean).length,
    );
  }
  const lowConf = t.segments.filter((s) => s.confidence < CONFIDENCE_THRESHOLD).length;

  await sql.begin(async (tx) => {
    await tx`
      update meetings set
        duration_ms = ${t.durationMs},
        low_confidence_ratio = ${t.segments.length ? lowConf / t.segments.length : 0}
      where id = ${meetingId}`;

    for (const label of labels) {
      await tx`
        insert into speakers (id, meeting_id, diarization_id, name, hue, talk_ms, word_count)
        values (${spIdOf(meetingId, label)}, ${meetingId}, ${label},
                ${`Speaker ${label + 1}`}, ${hueFor(label)},
                ${talk.get(label) ?? 0}, ${words.get(label) ?? 0})
        on conflict (id) do update set
          talk_ms = excluded.talk_ms, word_count = excluded.word_count`;
    }

    for (const [i, s] of t.segments.entries()) {
      const prev: RawSegment | undefined = t.segments[i - 1];
      await tx`
        insert into segments (id, meeting_id, speaker_id, start_ms, end_ms, text, confidence, crosstalk, idx)
        values (${segIdOf(meetingId, i)}, ${meetingId}, ${spIdOf(meetingId, s.speakerLabel)},
                ${s.startMs}, ${s.endMs}, ${s.text}, ${s.confidence},
                ${isCrosstalk(prev, s)}, ${i})
        on conflict (id) do update set text = excluded.text`;
    }
  });

  await setStatus(meetingId, "analysing");
  return { segments: t.segments.length };
}

// ---------------------------------------------------------------------------
// Step 2 — analysis, reading the transcript back out of Postgres
// ---------------------------------------------------------------------------

export async function runAnalysis(
  meetingId: string,
  templateKey = "general",
): Promise<{ bullets: number; actions: number; chapters: number }> {
  const sql = db();
  if (!sql) throw new Error("DATABASE_URL is not set");

  const rows = await sql<
    { start_ms: number; end_ms: number; text: string; confidence: number; diarization_id: number }[]
  >`
    select s.start_ms, s.end_ms, s.text, s.confidence, sp.diarization_id
    from segments s join speakers sp on sp.id = s.speaker_id
    where s.meeting_id = ${meetingId}
    order by s.idx`;

  if (!rows.length) throw new Error("No transcript to analyse");

  const segments: RawSegment[] = rows.map((r) => ({
    speakerLabel: r.diarization_id,
    startMs: r.start_ms,
    endMs: r.end_ms,
    text: r.text,
    confidence: r.confidence,
  }));

  const a = await analyse(segments, templateKey);

  let bullets = 0;
  await sql.begin(async (tx) => {
    await tx`
      update meetings set title = ${a.title}, gist = ${a.gist} where id = ${meetingId}`;

    // Names the model recovered from the conversation itself. Where it could
    // not tell, the Speaker N label stays — and the repair UI handles the rest.
    for (const [label, name] of Object.entries(a.speakerNames)) {
      await tx`
        update speakers set name = ${name}
        where id = ${spIdOf(meetingId, Number(label))}`;
    }

    await tx`delete from chapters where meeting_id = ${meetingId}`;
    for (const [i, c] of a.chapters.entries()) {
      const s0 = segments[c.startIdx];
      const nextIdx = a.chapters[i + 1]?.startIdx ?? segments.length;
      const s1 = segments[Math.max(c.startIdx, nextIdx - 1)];
      if (!s0 || !s1) continue;
      await tx`
        insert into chapters (id, meeting_id, start_ms, end_ms, title, gist, idx)
        values (${`${meetingId}-c${i}`}, ${meetingId}, ${s0.startMs}, ${s1.endMs},
                ${c.title}, ${c.gist}, ${i})`;
    }

    const summaryId = `${meetingId}-sum-${templateKey}`;
    await tx`delete from summaries where id = ${summaryId}`;
    await tx`
      insert into summaries (id, meeting_id, template_key, model)
      values (${summaryId}, ${meetingId}, ${templateKey}, ${a.model})`;

    const wanted = TEMPLATE_SECTIONS[templateKey] ?? TEMPLATE_SECTIONS.general;
    const ordered = wanted
      .map((h) => a.sections.find((s) => s.heading === h))
      .filter((s): s is NonNullable<typeof s> => Boolean(s));

    for (const [i, sec] of ordered.entries()) {
      const secId = `${summaryId}-sec${i}`;
      await tx`
        insert into summary_sections (id, summary_id, heading, idx)
        values (${secId}, ${summaryId}, ${sec.heading}, ${i})`;
      for (const [j, b] of sec.bullets.entries()) {
        const seg = segments[b.segmentIdx];
        if (!seg) continue; // unresolvable citation — dropped, never rendered
        bullets++;
        await tx`
          insert into summary_bullets (id, section_id, text, anchor_ms, segment_id, speaker_id, idx)
          values (${`${secId}-b${j}`}, ${secId}, ${b.text}, ${seg.startMs},
                  ${segIdOf(meetingId, b.segmentIdx)},
                  ${spIdOf(meetingId, seg.speakerLabel)}, ${j})`;
      }
    }

    await tx`delete from action_items where meeting_id = ${meetingId} and user_generated = false`;
    for (const [i, act] of a.actions.entries()) {
      const seg = segments[act.segmentIdx];
      if (!seg) continue;
      const assignee =
        act.speakerLabel !== null &&
        segments.some((s) => s.speakerLabel === act.speakerLabel)
          ? spIdOf(meetingId, act.speakerLabel)
          : null;
      await tx`
        insert into action_items (id, meeting_id, text, assignee_id, anchor_ms, segment_id, due_hint, idx)
        values (${`${meetingId}-a${i}`}, ${meetingId}, ${act.text}, ${assignee},
                ${seg.startMs}, ${segIdOf(meetingId, act.segmentIdx)},
                ${act.dueHint ?? null}, ${i})`;
    }

    await tx`delete from highlights where meeting_id = ${meetingId} and created_by = 'AI'`;
    for (const [i, h] of a.highlights.entries()) {
      const s0 = segments[h.startIdx];
      const s1 = segments[h.endIdx] ?? s0;
      if (!s0) continue;
      await tx`
        insert into highlights (id, meeting_id, category_key, start_ms, end_ms, title, note, created_by)
        values (${`${meetingId}-h${i}`}, ${meetingId}, ${h.categoryKey},
                ${s0.startMs}, ${s1.endMs}, ${h.title}, ${h.note ?? null}, 'AI')`;
    }
  });

  await setStatus(meetingId, "ready");
  return { bullets, actions: a.actions.length, chapters: a.chapters.length };
}
