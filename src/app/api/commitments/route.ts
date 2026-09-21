import { NextResponse } from "next/server";
import { corpus } from "@/lib/data/store";
import { PERSON_BY_ID } from "@/lib/seed/cast";
import { buildIndex, search, tokenize } from "@/lib/search/engine";
import { collectClaims, pairUp, type Claim } from "@/lib/commitments/collect";
import { judgePairs } from "@/lib/commitments/judge";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Scan every meeting for commitments that later meetings contradicted.
 *
 * Retrieval narrows the field — the BM25 + expansion engine already in this
 * repo, scoring each commitment against every claim from a different meeting
 * — and only the survivors go to the model. Without that step this is O(n²)
 * model calls over claims that have nothing to do with each other.
 */
export async function POST() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set on the server" },
      { status: 503 },
    );
  }

  const c = corpus();
  const claims = collectClaims(c.meetings, c.summaries, c.actionItems, PERSON_BY_ID);

  // Score two claims by term overlap through the same index the search page
  // uses, so "renewal date" finds "contract timeline" rather than needing the
  // two meetings to have used identical words.
  const index = buildIndex(
    [],
    claims.map((cl) => ({
      segmentId: cl.id,
      meetingId: cl.meetingId,
      anchorMs: cl.anchorMs,
      text: cl.text,
      speakerId: cl.speakerId,
    })),
  );
  const meta = new Map(c.meetings.map((m) => [m.id, { title: m.title, startedAt: m.startedAt }]));

  // One search per commitment, results keyed by claim id.
  const hitsFor = new Map<string, Map<string, number>>();
  for (const cl of claims) {
    if (cl.kind === "point") continue;
    if (tokenize(cl.text).length < 3) continue;
    const hits = search(index, cl.text, meta, { limit: 12, source: "summary" });
    const m = new Map<string, number>();
    for (const h of hits) m.set(h.segmentId, h.score);
    hitsFor.set(cl.id, m);
  }

  const score = (earlier: Claim, later: Claim) => hitsFor.get(later.id)?.get(earlier.id) ?? 0;
  const pairs = pairUp(claims, score, { perClaim: 2, min: 0.18, max: 36 });

  try {
    const { judgements, model, proposed, dropped } = await judgePairs(pairs);
    return NextResponse.json({
      model,
      scanned: {
        meetings: c.meetings.length,
        claims: claims.length,
        pairsCompared: pairs.length,
        verdictsProposed: proposed,
        verdictsDropped: dropped,
      },
      findings: judgements
        .map((j) => {
          const p = pairs[j.pairIdx];
          return {
            verdict: j.verdict,
            note: j.note,
            confidence: j.confidence,
            earlier: p.earlier,
            later: p.later,
          };
        })
        // Contradictions first — that is the reason anyone opens this page.
        .sort((a, b) => {
          const rank = { contradicted: 0, revised: 1, kept: 2, unrelated: 3 } as const;
          return (
            rank[a.verdict] - rank[b.verdict] ||
            b.confidence - a.confidence
          );
        }),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Scan failed" },
      { status: 500 },
    );
  }
}
