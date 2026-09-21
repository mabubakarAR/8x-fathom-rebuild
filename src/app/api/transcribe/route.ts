import { NextResponse } from "next/server";
import { transcribe, transcriptionConfigured } from "@/lib/pipeline/transcribe";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Turn a recorded call into a diarized transcript.
 *
 * This is the half of capture the browser cannot do. The Web Speech API only
 * ever hears the default microphone and does not diarize, so it can transcribe
 * *you* live but not the four other people on the call. Deepgram takes the
 * mixed recording — your mic and the meeting tab's audio, already combined —
 * and returns speech grouped into turns with a speaker label per turn.
 *
 * Without a key this returns 503 and the caller falls back to the live
 * captions, which is a real degradation and is said out loud in the UI rather
 * than hidden.
 */
export async function POST(req: Request) {
  if (!transcriptionConfigured()) {
    return NextResponse.json(
      { error: "DEEPGRAM_API_KEY is not set on the server" },
      { status: 503 },
    );
  }

  const mime = req.headers.get("content-type") || "audio/webm";
  const bytes = await req.arrayBuffer();
  if (!bytes.byteLength) {
    return NextResponse.json({ error: "No audio received" }, { status: 400 });
  }
  // Vercel caps a request body at 4.5MB on the hobby tier; an hour of Opus is
  // well under that, but say so clearly rather than failing opaquely.
  if (bytes.byteLength > 24 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Recording is too large to transcribe in one request (24MB max)" },
      { status: 413 },
    );
  }

  try {
    const result = await transcribe(bytes, mime);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Transcription failed" },
      { status: 500 },
    );
  }
}
