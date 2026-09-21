import type { ActionItem, Meeting, Person, Summary } from "@/lib/types";

// Commitments.
//
// Every notetaker in this category summarises a meeting. None of them notice
// that the meeting *before* it said something different. That is the actual
// failure mode of recurring work: nobody forgets what was said in the room,
// they forget that three weeks later a different room reversed it — and the
// notes from both rooms are individually correct, which is exactly why the
// contradiction survives.
//
// Fathom's Trackers watch topics ("mentions of Cumulus"). Nothing in the
// category watches *commitments*: a date, an owner, a decision, and whether
// it still holds. That gap is what this is for.
//
// The unit here is a claim that already carries a citation — a summary bullet
// or an action item — because the whole product rests on never asserting
// anything it cannot point at. A contradiction with no evidence on both sides
// is gossip.

export interface Claim {
  /** Stable id: the bullet or action item it came from. */
  id: string;
  meetingId: string;
  meetingTitle: string;
  /** ISO — used to decide which of a pair came first. */
  startedAt: string;
  anchorMs: number;
  speakerId: string;
  speakerName: string;
  text: string;
  kind: "decision" | "action" | "point";
}

/** Sections whose bullets are commitments rather than colour. */
const COMMITTING = /decision|next step|agree|commit|owner|deadline|timeline|target|date/i;

export function collectClaims(
  meetings: Meeting[],
  summaries: Summary[],
  actionItems: ActionItem[],
  peopleById: Map<string, Person>,
): Claim[] {
  const meta = new Map(meetings.map((m) => [m.id, m]));
  const out: Claim[] = [];

  const nameOf = (id: string) => peopleById.get(id)?.name ?? "Unknown";

  for (const s of summaries) {
    const m = meta.get(s.meetingId);
    if (!m) continue;
    for (const sec of s.sections) {
      // A bullet under "Decisions" or "Next steps" is a commitment. A bullet
      // under "Company context" is background, and pairing background against
      // background produces noise that looks like insight.
      const committing = COMMITTING.test(sec.heading);
      for (const b of sec.bullets) {
        out.push({
          id: b.id,
          meetingId: m.id,
          meetingTitle: m.title,
          startedAt: m.startedAt,
          anchorMs: b.anchorMs,
          speakerId: b.speakerId ?? "",
          speakerName: b.speakerId ? nameOf(b.speakerId) : "Unknown",
          text: b.text,
          kind: committing ? "decision" : "point",
        });
      }
    }
  }

  for (const a of actionItems) {
    const m = meta.get(a.meetingId);
    if (!m) continue;
    out.push({
      id: a.id,
      meetingId: m.id,
      meetingTitle: m.title,
      startedAt: m.startedAt,
      anchorMs: a.anchorMs,
      speakerId: a.assigneeId ?? "",
      speakerName: a.assigneeId ? nameOf(a.assigneeId) : "Unassigned",
      text: a.text,
      kind: "action",
    });
  }

  return out;
}

export interface ClaimPair {
  earlier: Claim;
  later: Claim;
  /** Retrieval score, kept so the UI can say why these two were compared. */
  score: number;
}

/**
 * Candidate pairs, using the search engine already in this repo as the
 * retriever.
 *
 * Every claim is a query against every other meeting's claims. That is the
 * work the BM25 + expansion engine was built for, and it is why that work was
 * not wasted when the AI layer became real: it is the thing that stops this
 * from being an O(n²) pile of model calls over claims that have nothing to do
 * with each other.
 */
export function pairUp(
  claims: Claim[],
  score: (a: Claim, b: Claim) => number,
  opts: { perClaim?: number; min?: number; max?: number } = {},
): ClaimPair[] {
  const { perClaim = 2, min = 0.16, max = 40 } = opts;
  const byTime = [...claims].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const seen = new Set<string>();
  const pairs: ClaimPair[] = [];

  for (let i = byTime.length - 1; i >= 0; i--) {
    const later = byTime[i];
    // Only commitments are worth chasing forward; a later "point" contradicting
    // an earlier "point" is usually two people describing the same thing.
    if (later.kind === "point") continue;

    const cands: ClaimPair[] = [];
    for (let j = 0; j < i; j++) {
      const earlier = byTime[j];
      if (earlier.meetingId === later.meetingId) continue;
      const s = score(earlier, later);
      if (s < min) continue;
      cands.push({ earlier, later, score: s });
    }
    cands.sort((a, b) => b.score - a.score);

    for (const c of cands.slice(0, perClaim)) {
      const key = `${c.earlier.id}|${c.later.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push(c);
    }
  }

  return pairs.sort((a, b) => b.score - a.score).slice(0, max);
}
