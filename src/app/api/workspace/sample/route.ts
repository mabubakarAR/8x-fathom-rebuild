import { NextResponse } from "next/server";
import { currentUserId } from "@/auth";
import { importSample, removeSample } from "@/lib/db/sample";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Import the nine-meeting sample into the signed-in user's workspace. */
export async function POST() {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const r = await importSample(uid);
  return NextResponse.json(r, { status: r.ok ? 200 : 500 });
}

/** Remove it again. Real recordings are untouched. */
export async function DELETE() {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  return NextResponse.json({ removed: await removeSample(uid) });
}
