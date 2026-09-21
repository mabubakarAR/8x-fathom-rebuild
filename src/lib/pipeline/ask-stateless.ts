import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { RawSegment } from "./transcribe";
import type { AskEvidence } from "../evidence";

export type { AskEvidence };

// Grounded Ask without a database.
//
// Same contract as the Postgres version: the model only sees real transcript
// lines, cites them by index, and every index is validated against the array
// before the answer is returned. An index the array cannot resolve is dropped,
// and an answer that loses all of its citations is reported as ungrounded
// rather than presented as fact.
//
// Retrieval here is the BM25 + expansion engine already in this repo, which is
// why that work was not wasted when the AI layer became real — it is now the
// retriever in front of the model instead of a substitute for one.

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

export function llmConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export interface StatelessCitation {
  segmentIdx: number;
  anchorMs: number;
  snippet: string;
  speaker: string;
}

const SYSTEM = `You answer questions about a meeting using only the transcript lines supplied.

Rules:
- Use ONLY those lines. If they do not contain the answer, say so plainly.
  "The transcript doesn't cover that" is a correct and useful answer.
- Never speculate, never generalise past what was said, never invent a speaker.
- Cite the lines you used by their [index].
- Be brief: two or three sentences unless the question genuinely needs a list.

Reply with JSON only, no markdown fence:
{ "answer": "...", "citations": [12, 44] }`;

export async function askOverSegments(
  segments: RawSegment[],
  speakerNames: Record<number, string>,
  question: string,
  candidateIdxs: number[],
): Promise<{
  text: string;
  citations: StatelessCitation[];
  grounded: boolean;
  model: string;
  evidence: AskEvidence;
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  const t0 = Date.now();

  const idxs = [...new Set(candidateIdxs)].filter((i) => i >= 0 && i < segments.length).sort((a, b) => a - b);
  if (!idxs.length) {
    return {
      text: "There is nothing in this transcript to answer from.",
      citations: [],
      grounded: false,
      model: MODEL,
      evidence: { considered: 0, proposed: 0, resolved: 0, dropped: [], elapsedMs: Date.now() - t0 },
    };
  }

  const name = (label: number) => speakerNames[label] || `Speaker ${label + 1}`;
  const context = idxs
    .map((i) => `[${i}] (${fmt(segments[i].startMs)}) ${name(segments[i].speakerLabel)}: ${segments[i].text}`)
    .join("\n");

  const msg = await new Anthropic({ apiKey }).messages.create({
    model: MODEL,
    max_tokens: 1200,
    system: SYSTEM,
    messages: [{ role: "user", content: `Question: ${question}\n\nTranscript lines:\n\n${context}` }],
  });

  const raw = msg.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");

  let text = raw.trim();
  let cited: number[] = [];
  try {
    const a = raw.indexOf("{"), b = raw.lastIndexOf("}");
    const parsed = JSON.parse(raw.slice(a, b + 1)) as { answer?: string; citations?: unknown[] };
    if (typeof parsed.answer === "string") text = parsed.answer.trim();
    cited = (parsed.citations ?? []).map(Number).filter((n) => Number.isFinite(n));
  } catch {
    // Model ignored the format; keep its prose and let it lose its citations.
  }

  const seen = new Set<number>();
  const citations: StatelessCitation[] = [];
  const dropped: { citedIdx: number; reason: string }[] = [];
  for (const i of cited) {
    // The validation step: an index outside the real array, or one the model
    // was never shown, is a hallucinated citation and is discarded.
    if (seen.has(i)) continue;
    if (!idxs.includes(i)) {
      dropped.push({
        citedIdx: i,
        reason:
          i >= 0 && i < segments.length
            ? `line ${i} exists but was never retrieved for this question`
            : `line ${i} does not exist in this transcript`,
      });
      continue;
    }
    seen.add(i);
    const s = segments[i];
    citations.push({
      segmentIdx: i,
      anchorMs: s.startMs,
      snippet: s.text.length > 180 ? s.text.slice(0, 180) + "…" : s.text,
      speaker: name(s.speakerLabel),
    });
  }

  return {
    text,
    citations,
    grounded: citations.length > 0,
    model: MODEL,
    evidence: {
      considered: idxs.length,
      proposed: new Set(cited).size,
      resolved: citations.length,
      dropped,
      elapsedMs: Date.now() - t0,
    },
  };
}

function fmt(ms: number): string {
  const t = Math.round(ms / 1000);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}
