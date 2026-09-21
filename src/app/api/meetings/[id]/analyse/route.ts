import { NextResponse } from "next/server";
import { runAnalysis, setStatus } from "@/lib/pipeline/ingest";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const r = await runAnalysis(id, body.template || "general");
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "analysis failed";
    await setStatus(id, "failed", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
