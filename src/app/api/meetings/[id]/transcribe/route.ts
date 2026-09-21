import { NextResponse } from "next/server";
import { runTranscription, setStatus } from "@/lib/pipeline/ingest";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const r = await runTranscription(id);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "transcription failed";
    await setStatus(id, "failed", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
