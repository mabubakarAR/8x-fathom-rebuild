import "server-only";
import { db } from "./client";
import type { Analysis } from "@/lib/pipeline/analyse";
import type { RawSegment } from "@/lib/pipeline/transcribe";
import { sliceMeeting } from "@/lib/thumb";

// Saving a call, and getting it back.
//
// Until now a recording lived in IndexedDB and its meeting in localStorage,
// which meant: one browser, one machine, gone the moment site data was
// cleared, and a share link that opened nothing for the person you sent it
// to. That is a demo, not a product.
//
// This writes the whole thing to Postgres in one transaction — meeting,
// speakers, segments, chapters, summary, action items, highlights and the
// evidence ledger — so a call outlives the browser that made it and a URL
// works from any device.
//
// Everything degrades. If DATABASE_URL is missing, save() reports that and
// the caller keeps its local copy; nothing throws into a recording the user
// just spent ten minutes making.

export interface SaveCallInput {
  id: string;
  title: string;
  gist: string;
  startedAt: string;
  durationMs: number;
  origin: "call" | "mic" | "import" | "upload";
  templateKey: string;
  transcriptSource: string;
  mediaUrl?: string | null;
  mediaMime?: string | null;
  /**
   * The audio itself, when there is nowhere else to put it.
   *
   * Object storage is the right home for a media file and the code prefers
   * it. But a deployment without a blob store shouldn't lose the recording —
   * that is the one thing a user cannot reconstruct — and a few megabytes of
   * Opus in a bytea column is a real answer, not a hack, at this size.
   */
  mediaBytes?: Uint8Array | null;
  segments: RawSegment[];
  speakerNames: Record<string, string>;
  analysis: Analysis;
}

const LOW_CONFIDENCE = 0.82;

export async function saveCall(
  input: SaveCallInput,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const sql = db();
  if (!sql) return { ok: false, reason: "DATABASE_URL is not set" };

  const {
    id,
    segments,
    speakerNames,
    analysis,
    durationMs,
  } = input;

  const labels = [...new Set(segments.map((s) => s.speakerLabel))].sort((a, b) => a - b);
  const spId = (label: number) => `${id}-sp${label}`;
  const segId = (i: number) => `${id}-s${i}`;
  const nameOf = (label: number) => speakerNames[String(label)] || `Speaker ${label + 1}`;

  const talk = new Map<number, number>();
  const words = new Map<number, number>();
  for (const s of segments) {
    talk.set(s.speakerLabel, (talk.get(s.speakerLabel) ?? 0) + (s.endMs - s.startMs));
    words.set(
      s.speakerLabel,
      (words.get(s.speakerLabel) ?? 0) + s.text.split(/\s+/).filter(Boolean).length,
    );
  }
  const lowConf = segments.filter((s) => s.confidence < LOW_CONFIDENCE).length;

  try {
    await sql.begin(async (tx) => {
      // Re-saving the same id replaces it wholesale. Every child table
      // cascades, so one delete is the whole cleanup.
      await tx`delete from meetings where id = ${id}`;

      await tx`
        insert into meetings (
          id, title, kind, platform, started_at, duration_ms, gist, status,
          media_url, media_mime, media_bytes, origin, transcript_source,
          low_confidence_ratio, shape
        ) values (
          ${id}, ${input.title}, 'planning',
          ${input.origin === "call" ? "browser" : "upload"},
          ${input.startedAt}, ${Math.round(durationMs)}, ${input.gist}, 'ready',
          ${input.mediaUrl ?? null}, ${input.mediaMime ?? null},
          ${input.mediaBytes ? Buffer.from(input.mediaBytes) : null},
          ${input.origin}, ${input.transcriptSource},
          ${segments.length ? lowConf / segments.length : 0},
          ${JSON.stringify(
            sliceMeeting(
              segments.map((s) => ({
                startMs: s.startMs,
                endMs: s.endMs,
                hue: s.speakerLabel % 15,
              })),
              durationMs,
            ),
          )}
        )`;

      for (const label of labels) {
        await tx`
          insert into speakers (id, meeting_id, diarization_id, name, hue, talk_ms, word_count)
          values (${spId(label)}, ${id}, ${label}, ${nameOf(label)}, ${label % 15},
                  ${Math.round(talk.get(label) ?? 0)}, ${words.get(label) ?? 0})`;
      }

      // Segments go in as one multi-row insert: 300 round-trips inside a
      // transaction is how a save that should take a second takes thirty.
      if (segments.length) {
        await tx`insert into segments ${tx(
          segments.map((s, i) => ({
            id: segId(i),
            meeting_id: id,
            speaker_id: spId(s.speakerLabel),
            start_ms: Math.round(s.startMs),
            end_ms: Math.round(s.endMs),
            text: s.text,
            confidence: s.confidence,
            crosstalk: i > 0 && s.startMs < segments[i - 1].endMs - 120,
            idx: i,
          })),
        )}`;
      }

      const chapters = analysis.chapters
        .filter((c) => segments[c.startIdx])
        .map((c, i, arr) => {
          const next = arr[i + 1]?.startIdx ?? segments.length;
          return {
            id: `${id}-c${i}`,
            meeting_id: id,
            start_ms: Math.round(segments[c.startIdx].startMs),
            end_ms: Math.round(segments[Math.max(c.startIdx, next - 1)]?.endMs ?? durationMs),
            title: c.title,
            gist: c.gist,
            idx: i,
          };
        });
      if (chapters.length) await tx`insert into chapters ${tx(chapters)}`;

      const sumId = `${id}-sum`;
      await tx`
        insert into summaries (id, meeting_id, template_key, model)
        values (${sumId}, ${id}, ${input.templateKey}, ${analysis.model})`;

      for (const [i, sec] of analysis.sections.entries()) {
        const secId = `${id}-sec${i}`;
        await tx`
          insert into summary_sections (id, summary_id, heading, idx)
          values (${secId}, ${sumId}, ${sec.heading}, ${i})`;
        const bullets = sec.bullets
          .filter((b) => segments[b.segmentIdx])
          .map((b, j) => ({
            id: `${secId}-b${j}`,
            section_id: secId,
            text: b.text,
            anchor_ms: Math.round(segments[b.segmentIdx].startMs),
            segment_id: segId(b.segmentIdx),
            speaker_id: spId(segments[b.segmentIdx].speakerLabel),
            idx: j,
          }));
        if (bullets.length) await tx`insert into summary_bullets ${tx(bullets)}`;
      }

      const actions = analysis.actions
        .filter((a) => segments[a.segmentIdx])
        .map((a, i) => ({
          id: `${id}-a${i}`,
          meeting_id: id,
          text: a.text,
          assignee_id:
            a.speakerLabel !== null && labels.includes(a.speakerLabel)
              ? spId(a.speakerLabel)
              : null,
          anchor_ms: Math.round(segments[a.segmentIdx].startMs),
          segment_id: segId(a.segmentIdx),
          due_hint: a.dueHint ?? null,
          idx: i,
        }));
      if (actions.length) await tx`insert into action_items ${tx(actions)}`;

      const highlights = analysis.highlights
        .filter((h) => segments[h.startIdx])
        .map((h, i) => ({
          id: `${id}-h${i}`,
          meeting_id: id,
          category_key: h.categoryKey,
          start_ms: Math.round(segments[h.startIdx].startMs),
          end_ms: Math.round((segments[h.endIdx] ?? segments[h.startIdx]).endMs),
          title: h.title,
          note: h.note ?? null,
        }));
      if (highlights.length) await tx`insert into highlights ${tx(highlights)}`;

      const ev = analysis.evidence;
      await tx`
        insert into evidence (
          meeting_id, model, segment_count, max_idx, proposed, resolved,
          elapsed_ms, dropped
        ) values (
          ${id}, ${ev.model}, ${ev.segmentCount}, ${ev.maxIdx}, ${ev.proposed},
          ${ev.resolved}, ${ev.elapsedMs}, ${JSON.stringify(ev.dropped)}
        )`;
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

export interface StoredCall {
  id: string;
  title: string;
  gist: string;
  startedAt: string;
  durationMs: number;
  origin: string;
  templateKey: string;
  transcriptSource: string | null;
  mediaUrl: string | null;
  segments: RawSegment[];
  speakerNames: Record<string, string>;
  analysis: Analysis;
}

/** Read a saved call back into the exact shape the meeting UI already speaks. */
export async function loadCall(id: string): Promise<StoredCall | null> {
  const sql = db();
  if (!sql) return null;

  try {
    // Every column except the audio. `select *` would drag a few megabytes of
    // bytea through on every page open, for a field this function never reads.
    const [meeting] = await sql`
      select id, title, kind, platform, started_at, duration_ms, gist, status,
             media_url, media_mime, origin, transcript_source,
             low_confidence_ratio, shape
      from meetings where id = ${id}`;
    if (!meeting) return null;

    const [speakers, segs, chaps, sums, acts, hls, [ev]] = await Promise.all([
      sql`select * from speakers where meeting_id = ${id} order by diarization_id`,
      sql`select * from segments where meeting_id = ${id} order by idx`,
      sql`select * from chapters where meeting_id = ${id} order by idx`,
      sql`select * from summaries where meeting_id = ${id}`,
      sql`select * from action_items where meeting_id = ${id} order by idx`,
      sql`select * from highlights where meeting_id = ${id} order by start_ms`,
      sql`select * from evidence where meeting_id = ${id}`,
    ]);

    const idxOf = new Map<string, number>(segs.map((s, i) => [s.id as string, i]));
    const labelOf = new Map<string, number>(
      speakers.map((s) => [s.id as string, s.diarization_id as number]),
    );

    const speakerNames: Record<string, string> = {};
    for (const s of speakers) speakerNames[String(s.diarization_id)] = s.name as string;

    const segments: RawSegment[] = segs.map((s) => ({
      speakerLabel: labelOf.get(s.speaker_id as string) ?? 0,
      startMs: s.start_ms as number,
      endMs: s.end_ms as number,
      text: s.text as string,
      confidence: s.confidence as number,
    }));

    const summary = sums[0];
    const sections: Analysis["sections"] = [];
    if (summary) {
      const secs = await sql`
        select * from summary_sections where summary_id = ${summary.id as string} order by idx`;
      for (const sec of secs) {
        const bullets = await sql`
          select * from summary_bullets where section_id = ${sec.id as string} order by idx`;
        sections.push({
          heading: sec.heading as string,
          bullets: bullets.map((b) => ({
            text: b.text as string,
            segmentIdx: idxOf.get(b.segment_id as string) ?? 0,
          })),
        });
      }
    }

    const analysis: Analysis = {
      title: meeting.title as string,
      gist: meeting.gist as string,
      speakerNames,
      chapters: chaps.map((c) => ({
        title: c.title as string,
        gist: c.gist as string,
        startIdx: segs.findIndex((s) => (s.start_ms as number) >= (c.start_ms as number)),
      })),
      sections,
      actions: acts.map((a) => ({
        text: a.text as string,
        speakerLabel: a.assignee_id ? (labelOf.get(a.assignee_id as string) ?? null) : null,
        segmentIdx: idxOf.get(a.segment_id as string) ?? 0,
        dueHint: (a.due_hint as string) ?? undefined,
      })),
      highlights: hls.map((h) => ({
        title: h.title as string,
        categoryKey: h.category_key as string,
        startIdx: segs.findIndex((s) => (s.start_ms as number) >= (h.start_ms as number)),
        endIdx: segs.findIndex((s) => (s.end_ms as number) >= (h.end_ms as number)),
        note: (h.note as string) ?? undefined,
      })),
      model: (summary?.model as string) ?? "unknown",
      evidence: {
        model: (ev?.model as string) ?? "unknown",
        segmentCount: (ev?.segment_count as number) ?? segments.length,
        maxIdx: (ev?.max_idx as number) ?? Math.max(0, segments.length - 1),
        proposed: (ev?.proposed as number) ?? 0,
        resolved: (ev?.resolved as number) ?? 0,
        elapsedMs: (ev?.elapsed_ms as number) ?? 0,
        dropped: (ev?.dropped as Analysis["evidence"]["dropped"]) ?? [],
      },
    };

    return {
      id,
      title: meeting.title as string,
      gist: meeting.gist as string,
      startedAt: new Date(meeting.started_at as string).toISOString(),
      durationMs: meeting.duration_ms as number,
      origin: (meeting.origin as string) ?? "import",
      templateKey: (summary?.template_key as string) ?? "general",
      transcriptSource: (meeting.transcript_source as string) ?? null,
      mediaUrl: (meeting.media_url as string) ?? null,
      segments,
      speakerNames,
      analysis,
    };
  } catch {
    // A read failure must not take the page down — the caller falls back to
    // whatever the browser still has.
    return null;
  }
}

/** Saved calls, newest first, for the call list. */
export async function listCalls(limit = 40) {
  const sql = db();
  if (!sql) return [];
  try {
    return await sql`
      select m.id, m.title, m.gist, m.started_at, m.duration_ms, m.origin,
             m.low_confidence_ratio, m.media_url, m.shape,
             (select count(*) from action_items a where a.meeting_id = m.id) as action_count,
             (select count(*) from highlights h where h.meeting_id = m.id) as highlight_count
      from meetings m
      where m.status = 'ready'
      order by m.started_at desc
      limit ${limit}`;
  } catch {
    return [];
  }
}
