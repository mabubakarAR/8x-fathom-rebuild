import { NextResponse } from "next/server";
import { askWorkspace } from "@/lib/pipeline/ask-workspace";
import { currentUserId } from "@/auth";
import { loadWorkspace } from "@/lib/data/workspace";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Ask a question of every meeting at once, answered with citations that
 *  name the meeting, the speaker and the moment. */
export async function POST(req: Request) {
  const { question } = (await req.json().catch(() => ({}))) as { question?: string };
  if (!question?.trim()) {
    return NextResponse.json({ error: "no question" }, { status: 400 });
  }
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  try {
    return NextResponse.json(await askWorkspace(await loadWorkspace(uid), question.trim()));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "ask failed" },
      { status: 500 },
    );
  }
}
