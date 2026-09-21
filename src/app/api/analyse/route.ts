import { NextResponse } from "next/server";
import { analyse } from "@/lib/pipeline/analyse";
import { parseTranscript } from "@/lib/pipeline/parse-transcript";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Parse a transcript and run the real analysis over it. Stateless: the
 *  result goes back to the caller, who keeps it. No database required. */
export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set on the server" }, { status: 503 });
  }
  const body = (await req.json()) as { text?: string; template?: string };
  if (!body.text?.trim()) return NextResponse.json({ error: "No transcript supplied" }, { status: 400 });
  if (body.text.length > 400_000) return NextResponse.json({ error: "Transcript is too long (400k characters max)" }, { status: 413 });

  const parsed = parseTranscript(body.text);
  if (!parsed.segments.length) {
    return NextResponse.json({ error: "Could not find any speech in that file", warnings: parsed.warnings }, { status: 422 });
  }

  try {
    const analysis = await analyse(parsed.segments, body.template || "general");
    return NextResponse.json({
      segments: parsed.segments,
      speakerNames: { ...parsed.speakerNames, ...analysis.speakerNames },
      format: parsed.format,
      warnings: parsed.warnings,
      analysis,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Analysis failed" }, { status: 500 });
  }
}
