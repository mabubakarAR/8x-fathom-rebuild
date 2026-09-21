import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { ClaimPair } from "./collect";

// Judging a pair.
//
// The retriever finds claims that are *about* the same thing. Only a model
// can tell whether the later one agrees with the earlier one, revises it, or
// flatly contradicts it — and that judgement is worth nothing unless it can
// be checked, so the same rule applies as everywhere else in this build: the
// model answers by id, every id is validated against the pairs it was shown,
// and anything that does not resolve is dropped rather than repaired.
//
// The verdict that matters is "contradicted". "Unrelated" is the expected
// answer most of the time and is thrown away silently — the retriever is
// tuned for recall on purpose, because a missed contradiction is a real cost
// and a rejected pair costs a few tokens.

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

export type Verdict = "contradicted" | "revised" | "kept" | "unrelated";

export interface Judgement {
  pairIdx: number;
  verdict: Verdict;
  /** One line, in plain language, saying what changed. */
  note: string;
  /** 0..1, the model's own confidence. Shown, not used as a gate. */
  confidence: number;
}

const SYSTEM = `You compare pairs of statements taken from different meetings in the same workspace.

For each pair you are given an EARLIER statement and a LATER one, with dates.

Classify the relationship:
- "contradicted" — the later statement is incompatible with the earlier one. A
  date moved, an owner changed, a decision was reversed, a number is different.
  This is the verdict that matters. Be strict: incompatible, not merely different.
- "revised" — the later statement narrows, delays or amends the earlier one
  without reversing it.
- "kept" — the later statement confirms, repeats or completes the earlier one.
- "unrelated" — they are about different things. This is the common case and
  there is no cost to saying it.

Rules:
- Judge only what the two statements say. Do not infer context you were not given.
- If a pair is ambiguous, it is "unrelated". A false contradiction is far more
  damaging than a missed one: it makes a person distrust every other verdict.
- The note must say what specifically changed, naming the values. "The date
  moved from 14 January to 28 January" — not "the timeline changed".
- Never invent a pair index.

Reply with JSON only, no markdown fence:
{ "judgements": [ { "pairIdx": 0, "verdict": "contradicted", "note": "...", "confidence": 0.8 } ] }`;

const VERDICTS: Verdict[] = ["contradicted", "revised", "kept", "unrelated"];

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export async function judgePairs(
  pairs: ClaimPair[],
): Promise<{ judgements: Judgement[]; model: string; proposed: number; dropped: number }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  if (!pairs.length) return { judgements: [], model: MODEL, proposed: 0, dropped: 0 };

  const rendered = pairs
    .map(
      (p, i) =>
        `[${i}]\n` +
        `  EARLIER (${fmtDate(p.earlier.startedAt)}, ${p.earlier.meetingTitle}, ${p.earlier.speakerName}): ${p.earlier.text}\n` +
        `  LATER   (${fmtDate(p.later.startedAt)}, ${p.later.meetingTitle}, ${p.later.speakerName}): ${p.later.text}`,
    )
    .join("\n\n");

  const msg = await new Anthropic({ apiKey }).messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Classify every pair below. Return one judgement per pair, using its index.\n\n${rendered}`,
      },
    ],
  });

  const raw = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  let parsed: { judgements?: unknown[] } = {};
  try {
    const a = raw.indexOf("{");
    const b = raw.lastIndexOf("}");
    parsed = JSON.parse(raw.slice(a, b + 1));
  } catch {
    return { judgements: [], model: MODEL, proposed: 0, dropped: 0 };
  }

  const list = (parsed.judgements ?? []) as Record<string, unknown>[];
  const seen = new Set<number>();
  const out: Judgement[] = [];
  let dropped = 0;

  for (const j of list) {
    const idx = typeof j.pairIdx === "number" ? Math.round(j.pairIdx) : Number.NaN;
    // Validation, same discipline as the summary citations: an index the
    // model was never shown is a hallucination, not a finding.
    if (!Number.isFinite(idx) || idx < 0 || idx >= pairs.length || seen.has(idx)) {
      dropped++;
      continue;
    }
    const verdict = VERDICTS.includes(j.verdict as Verdict) ? (j.verdict as Verdict) : "unrelated";
    if (verdict === "unrelated") {
      seen.add(idx);
      continue;
    }
    const note = typeof j.note === "string" ? j.note.trim().slice(0, 300) : "";
    if (!note) {
      dropped++;
      continue;
    }
    seen.add(idx);
    out.push({
      pairIdx: idx,
      verdict,
      note,
      confidence:
        typeof j.confidence === "number" && j.confidence >= 0 && j.confidence <= 1
          ? j.confidence
          : 0.6,
    });
  }

  return { judgements: out, model: MODEL, proposed: list.length, dropped };
}
