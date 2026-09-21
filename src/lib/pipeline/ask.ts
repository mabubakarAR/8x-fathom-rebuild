import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db/client";

// Ask, grounded in persisted data.
//
// Two properties this has to have, and the second is the one that is usually
// skipped:
//
//   1. The model only sees real transcript lines, retrieved from Postgres.
//   2. Every citation it returns is checked against the segments table before
//      the answer is stored or shown. A citation the database cannot resolve
//      is removed, and if an answer loses all of its citations it is marked
//      ungrounded rather than presented as fact.
//
// That second step is what makes a citation evidence instead of decoration.

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

export interface Citation {
  segmentId: string;
  anchorMs: number;
  snippet: string;
  speakerName: string;
}

export interface AskResult {
  text: string;
  citations: Citation[];
  model: string;
  /** False when the model produced no resolvable citation. Surfaced in the UI. */
  grounded: boolean;
}

interface Candidate {
  id: string;
  start_ms: number;
  text: string;
  speaker_name: string;
  idx: number;
}

/**
 * Retrieve candidate lines: Postgres full-text ranking, widened with the
 * neighbours of each hit so the model sees a turn in context rather than one
 * decontextualised sentence.
 */
async function retrieve(meetingId: string, question: string): Promise<Candidate[]> {
  const sql = db();
  if (!sql) return [];

  const hits = await sql<{ idx: number }[]>`
    select s.idx
    from segments s
    where s.meeting_id = ${meetingId}
      and s.tsv @@ websearch_to_tsquery('english', ${question})
    order by ts_rank(s.tsv, websearch_to_tsquery('english', ${question})) desc
    limit 18
  `;

  const want = new Set<number>();
  for (const h of hits) {
    for (let d = -1; d <= 1; d++) want.add(h.idx + d);
  }
  // With no lexical hit at all, fall back to a spread across the whole call so
  // the model can still answer "what was this about" style questions.
  if (!want.size) {
    const total = await sql<{ n: number }[]>`
      select count(*)::int as n from segments where meeting_id = ${meetingId}`;
    const n = total[0]?.n ?? 0;
    const step = Math.max(1, Math.floor(n / 40));
    for (let i = 0; i < n; i += step) want.add(i);
  }

  const idxs = [...want].filter((i) => i >= 0).sort((a, b) => a - b);
  if (!idxs.length) return [];

  return sql<Candidate[]>`
    select s.id, s.start_ms, s.text, s.idx, coalesce(sp.name, 'Unknown') as speaker_name
    from segments s
    left join speakers sp on sp.id = s.speaker_id
    where s.meeting_id = ${meetingId} and s.idx = any(${idxs})
    order by s.idx
    limit 140
  `;
}

const SYSTEM = `You answer questions about a meeting using only the transcript lines provided.

Rules:
- Use ONLY the supplied lines. If they do not contain the answer, say so plainly.
  "The transcript doesn't cover that" is a correct and useful answer.
- Never speculate, never generalise beyond what was said, never invent a speaker.
- Cite the lines you used by their id.
- Be brief. Two or three sentences unless the question genuinely needs a list.

Reply with JSON only, no markdown fence:
{ "answer": "...", "citations": ["seg-id-1", "seg-id-2"] }`;

export async function ask(meetingId: string, question: string): Promise<AskResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const candidates = await retrieve(meetingId, question);
  if (!candidates.length) {
    return {
      text: "There is no transcript stored for this meeting yet, so there is nothing to answer from.",
      citations: [],
      model: MODEL,
      grounded: false,
    };
  }

  const byId = new Map(candidates.map((c) => [c.id, c]));
  const context = candidates
    .map((c) => `[${c.id}] (${fmt(c.start_ms)}) ${c.speaker_name}: ${c.text}`)
    .join("\n");

  const msg = await new Anthropic({ apiKey }).messages.create({
    model: MODEL,
    max_tokens: 1200,
    system: SYSTEM,
    messages: [
      { role: "user", content: `Question: ${question}\n\nTranscript lines:\n\n${context}` },
    ],
  });

  const raw = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  let answer = raw.trim();
  let ids: string[] = [];
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const parsed = JSON.parse(raw.slice(start, end + 1)) as {
      answer?: string;
      citations?: unknown[];
    };
    if (typeof parsed.answer === "string") answer = parsed.answer.trim();
    ids = (parsed.citations ?? []).filter((x): x is string => typeof x === "string");
  } catch {
    // Model ignored the format. Keep its prose; it just loses its citations,
    // which the grounded flag will then report honestly.
  }

  // --- the validation step ---
  const seen = new Set<string>();
  const citations: Citation[] = [];
  for (const id of ids) {
    const c = byId.get(id);
    if (!c || seen.has(id)) continue; // hallucinated or duplicated id — dropped
    seen.add(id);
    citations.push({
      segmentId: c.id,
      anchorMs: c.start_ms,
      snippet: c.text.length > 180 ? c.text.slice(0, 180) + "…" : c.text,
      speakerName: c.speaker_name,
    });
  }

  return { text: answer, citations, model: MODEL, grounded: citations.length > 0 };
}

function fmt(ms: number): string {
  const t = Math.round(ms / 1000);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}
