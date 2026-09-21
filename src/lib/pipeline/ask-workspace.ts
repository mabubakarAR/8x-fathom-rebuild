import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { corpus } from "@/lib/data/store";
import { PERSON_BY_ID } from "@/lib/seed/cast";
import { buildIndex, search, type Index } from "@/lib/search/engine";

// Ask the whole workspace.
//
// The per-meeting Ask answers "what did we say in this call". This answers
// "what did we decide, across everything" — which is the question people
// actually have, and the one a folder of recordings cannot answer at all.
//
// It is the same discipline as the summary pipeline, applied one level up:
// the model sees only real transcript lines, it cites them by id, and every
// id is checked against the retrieved set before anything is shown. An id the
// retriever never handed it is dropped rather than repaired, and an answer
// that loses every citation is reported as ungrounded instead of being
// dressed up as fact.
//
// The retriever is the BM25 + cosine engine already used by search and the
// commitment tracker. Reusing it means the answer is drawn from exactly what
// a reviewer can verify by typing the same words into the search box.

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

export interface WorkspaceCitation {
  segmentId: string;
  meetingId: string;
  meetingTitle: string;
  startedAt: string;
  anchorMs: number;
  speakerName: string;
  snippet: string;
}

export interface WorkspaceAnswer {
  text: string;
  citations: WorkspaceCitation[];
  /** Ids the model produced that the retriever never handed it. Shown, not hidden. */
  dropped: string[];
  meetingsSearched: number;
  linesConsidered: number;
  elapsedMs: number;
  model: string;
  grounded: boolean;
}

// Built once per process. Rebuilding a BM25 index per question is how a
// feature that should feel instant feels broken.
let cached: Index | null = null;
function index(): Index {
  if (cached) return cached;
  const c = corpus();
  const summaryDocs = c.summaries.flatMap((s) =>
    s.sections.flatMap((sec) =>
      sec.bullets.map((b) => ({
        segmentId: b.id,
        meetingId: s.meetingId,
        anchorMs: b.anchorMs,
        text: b.text,
        speakerId: b.speakerId ?? "",
      })),
    ),
  );
  cached = buildIndex(c.segments, summaryDocs);
  return cached;
}

const SYSTEM = `You answer questions about a team's meeting history using only the transcript lines provided.

The lines come from several different meetings. Each is tagged with its meeting
title and date, so the same topic may appear more than once, at different times,
with different conclusions.

Rules:
- Use ONLY the supplied lines. If they do not answer the question, say so plainly.
  "Nothing in these meetings covers that" is a correct and useful answer.
- When the meetings disagree with each other, say so and give the dates. A later
  decision that reverses an earlier one is the single most useful thing you can
  surface; never quietly present the newer one as if it were the only one.
- Attribute to the speaker who actually said it. Never invent a speaker.
- Cite every claim by the line ids you used.
- Be brief: a short paragraph, or a few bullets when the answer is genuinely a list.

Reply with JSON only, no markdown fence:
{ "answer": "...", "citations": ["seg-id", "seg-id"] }`;

export async function askWorkspace(question: string): Promise<WorkspaceAnswer> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const t0 = Date.now();
  const c = corpus();
  const meta = new Map(
    c.meetings.map((m) => [m.id, { title: m.title, startedAt: m.startedAt }]),
  );

  // A wider alpha than the search page defaults to: a question is phrased
  // nothing like the sentence that answers it, so recall matters more here
  // than the precision a keyword search wants.
  const hits = search(index(), question, meta, { alpha: 0.5, limit: 48 });

  // Widen each hit to its neighbours inside the same meeting. A decision is
  // almost never stated in one sentence — the line before it is the question
  // that prompted it and the line after is the objection.
  const wanted = new Map<string, Set<number>>();
  const idxOf = new Map<string, number>();
  c.segments.forEach((s, i) => idxOf.set(s.id, i));
  const bySeg = new Map(c.segments.map((s) => [s.id, s]));

  for (const h of hits) {
    const i = idxOf.get(h.segmentId);
    if (i === undefined) continue; // a summary-bullet hit: useful for ranking, not citable
    const set = wanted.get(h.meetingId) ?? new Set<number>();
    for (let d = -1; d <= 1; d++) set.add(i + d);
    wanted.set(h.meetingId, set);
  }

  const picked: typeof c.segments = [];
  for (const [meetingId, set] of wanted) {
    for (const i of [...set].sort((a, b) => a - b)) {
      const s = c.segments[i];
      if (s && s.meetingId === meetingId) picked.push(s);
    }
  }
  picked.sort(
    (a, b) =>
      new Date(meta.get(a.meetingId)?.startedAt ?? 0).getTime() -
        new Date(meta.get(b.meetingId)?.startedAt ?? 0).getTime() ||
      a.startMs - b.startMs,
  );

  if (!picked.length) {
    return {
      text: "Nothing in the workspace matches that closely enough to answer from. Try naming a person, a customer, or a decision.",
      citations: [],
      dropped: [],
      meetingsSearched: c.meetings.length,
      linesConsidered: 0,
      elapsedMs: Date.now() - t0,
      model: MODEL,
      grounded: false,
    };
  }

  const nameOf = (speakerId: string) => PERSON_BY_ID.get(speakerId)?.name ?? "Unknown";
  const context = picked
    .map((s) => {
      const m = meta.get(s.meetingId);
      const date = m?.startedAt ? new Date(m.startedAt).toISOString().slice(0, 10) : "";
      return `[${s.id}] ${m?.title ?? s.meetingId} · ${date} · ${fmt(s.startMs)} · ${nameOf(
        s.speakerId,
      )}: ${s.text}`;
    })
    .join("\n");

  const msg = await new Anthropic({ apiKey }).messages.create({
    model: MODEL,
    max_tokens: 1400,
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
    // Model ignored the format. Keep the prose; it loses its citations, and
    // `grounded` will say so rather than the UI implying otherwise.
  }

  // --- validation: the part that makes a citation evidence ----------------
  const offered = new Set(picked.map((s) => s.id));
  const seen = new Set<string>();
  const citations: WorkspaceCitation[] = [];
  const dropped: string[] = [];

  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const s = offered.has(id) ? bySeg.get(id) : undefined;
    if (!s) {
      dropped.push(id);
      continue;
    }
    const m = meta.get(s.meetingId);
    citations.push({
      segmentId: s.id,
      meetingId: s.meetingId,
      meetingTitle: m?.title ?? s.meetingId,
      startedAt: m?.startedAt ?? "",
      anchorMs: s.startMs,
      speakerName: nameOf(s.speakerId),
      snippet: s.text.length > 220 ? s.text.slice(0, 220) + "…" : s.text,
    });
  }

  return {
    text: answer,
    citations,
    dropped,
    meetingsSearched: wanted.size,
    linesConsidered: picked.length,
    elapsedMs: Date.now() - t0,
    model: MODEL,
    grounded: citations.length > 0,
  };
}

function fmt(ms: number): string {
  const t = Math.round(ms / 1000);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}
