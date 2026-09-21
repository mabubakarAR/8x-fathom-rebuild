import { NextResponse } from "next/server";
import { askOverSegments } from "@/lib/pipeline/ask-stateless";
import type { RawSegment } from "@/lib/pipeline/transcribe";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Grounded Ask over segments supplied by the caller. Works for both the
 *  seeded meetings and an imported transcript - the model never sees anything
 *  that is not a real line, and citations are validated before they return. */
export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set on the server" }, { status: 503 });
  }
  const body = (await req.json()) as {
    question?: string;
    segments?: RawSegment[];
    speakerNames?: Record<number, string>;
    candidateIdxs?: number[];
  };
  if (!body.question?.trim()) return NextResponse.json({ error: "No question" }, { status: 400 });
  if (!Array.isArray(body.segments) || !body.segments.length) {
    return NextResponse.json({ error: "No transcript" }, { status: 400 });
  }

  try {
    const r = await askOverSegments(
      body.segments,
      body.speakerNames ?? {},
      body.question.trim(),
      body.candidateIdxs ?? body.segments.map((_, i) => i).slice(0, 120),
    );
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Ask failed" }, { status: 500 });
  }
}
