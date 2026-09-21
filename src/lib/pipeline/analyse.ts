import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { RawSegment } from "./transcribe";
import type { DroppedClaim, EvidenceLedger } from "../evidence";
import { validateAnalysis } from "./validate";

export { validateAnalysis };

export type { DroppedClaim, EvidenceLedger };

// The AI layer.
//
// This is the part the first version of this build faked, and faking it is
// what made the product a dashboard over fixtures. Everything below reads a
// transcript that came out of Deepgram and produces structure from it.
//
// The design constraint that matters: **every claim must cite a segment that
// exists.** The model is given numbered segments and must answer with segment
// indices, never free-text timestamps. Indices are then validated against the
// real array — anything out of range is dropped rather than rendered as a
// citation that goes nowhere. An unciteable bullet is a bug, not a bullet.

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

export function analysisConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function client(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  return new Anthropic({ apiKey });
}

export interface AnalysedChapter {
  title: string;
  gist: string;
  startIdx: number;
}
export interface AnalysedBullet {
  text: string;
  segmentIdx: number;
}
export interface AnalysedSection {
  heading: string;
  bullets: AnalysedBullet[];
}
export interface AnalysedAction {
  text: string;
  speakerLabel: number | null;
  segmentIdx: number;
  dueHint?: string;
}
export interface AnalysedHighlight {
  title: string;
  categoryKey: string;
  startIdx: number;
  endIdx: number;
  note?: string;
}
export interface Analysis {
  title: string;
  gist: string;
  speakerNames: Record<string, string>;
  chapters: AnalysedChapter[];
  sections: AnalysedSection[];
  actions: AnalysedAction[];
  highlights: AnalysedHighlight[];
  model: string;
  evidence: EvidenceLedger;
}

export const TEMPLATE_SECTIONS: Record<string, string[]> = {
  general: ["Overview", "Key points", "Decisions", "Next steps"],
  sales: ["Company context", "Pain and priorities", "Objections raised", "Buying signals", "Next steps"],
  "one-on-one": ["Updates", "Blockers", "Support needed", "Growth", "Next steps"],
  "project-update": ["Status by workstream", "What changed", "Slipping", "Decisions", "Next steps"],
  retro: ["Went well", "Did not go well", "Start doing", "Stop doing", "Next steps"],
  interview: ["Background", "Technical signal", "Concerns", "Candidate questions", "Next steps"],
  qa: ["Questions and answers", "Unanswered", "Next steps"],
};

const CATEGORIES = ["decision", "risk", "quote", "objection", "followup", "idea"];

/** Numbered transcript, which is what makes index-based citation possible. */
function renderTranscript(segments: RawSegment[], maxChars = 220_000): string {
  const lines: string[] = [];
  let used = 0;
  for (const [i, s] of segments.entries()) {
    const line = `[${i}] (${fmt(s.startMs)}) Speaker ${s.speakerLabel}: ${s.text}`;
    used += line.length + 1;
    if (used > maxChars) {
      lines.push(`… transcript truncated at segment ${i} of ${segments.length} …`);
      break;
    }
    lines.push(line);
  }
  return lines.join("\n");
}

function fmt(ms: number): string {
  const t = Math.round(ms / 1000);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}

const SYSTEM = `You analyse meeting transcripts for a meeting-intelligence product.

You are given a diarized transcript. Every line is numbered: [index] (timestamp) Speaker N: text

Rules that matter more than anything else:

1. CITE BY INDEX. Every claim you make must carry the index of the transcript
   line it came from. Never invent an index. Never cite a range you did not read.
2. If you cannot ground a claim in a specific line, do not make the claim.
3. Speaker N labels come from a diarizer and have no names. If someone is
   addressed by name in the transcript, map that speaker label to that name.
   If you cannot tell, leave them as "Speaker N" — guessing a name is worse
   than admitting you don't know.
4. Be specific. "Discussed pricing" is useless. "Diego has budget for 38k
   against a 52k list price" is useful. Prefer numbers, names, dates and
   commitments over topic labels.
5. Chapters must be contiguous and in order, each starting at the index where
   the topic actually changes. A 5-minute call has 2-3 chapters, not 8.

Reply with JSON only. No prose before or after, no markdown fence.`;

function schemaFor(sections: string[]): string {
  return `{
  "title": "short specific meeting title, max 8 words",
  "gist": "one sentence a reader could scan in a list: what happened and what it means",
  "speakerNames": { "0": "Name or Speaker 0", "1": "..." },
  "chapters": [{ "title": "short", "gist": "one line", "startIdx": 0 }],
  "sections": [${sections.map((h) => `{ "heading": ${JSON.stringify(h)}, "bullets": [{ "text": "...", "segmentIdx": 0 }] }`).join(", ")}],
  "actions": [{ "text": "imperative task", "speakerLabel": 0, "segmentIdx": 0, "dueHint": "optional, only if a date was actually said" }],
  "highlights": [{ "title": "short", "categoryKey": "one of ${CATEGORIES.join("|")}", "startIdx": 0, "endIdx": 0, "note": "optional one line" }]
}`;
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced ? fenced[1] : text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("model returned no JSON object");
  return JSON.parse(raw.slice(start, end + 1));
}

export async function analyse(
  segments: RawSegment[],
  templateKey = "general",
): Promise<Analysis> {
  const t0 = Date.now();
  const sections = TEMPLATE_SECTIONS[templateKey] ?? TEMPLATE_SECTIONS.general;
  const maxIdx = segments.length - 1;

  const msg = await client().messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Analyse this meeting and return exactly this JSON shape:

${schemaFor(sections)}

Use every section heading given, in that order. If a section genuinely has
nothing in it, return it with an empty bullets array rather than omitting it.

Transcript (${segments.length} lines, indices 0-${maxIdx}):

${renderTranscript(segments)}`,
      },
    ],
  });

  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const parsed = extractJson(text) as Record<string, unknown>;
  return validateAnalysis(parsed, segments.length, Date.now() - t0, MODEL);
}
