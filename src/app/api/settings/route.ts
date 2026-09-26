import { NextResponse } from "next/server";
import { currentUserId } from "@/auth";
import { loadSettings, saveSettings, disconnectCalendar, deleteAllData } from "@/lib/db/settings";
import { invalidateWorkspace } from "@/lib/data/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  return NextResponse.json(await loadSettings(uid));
}

export async function PATCH(req: Request) {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (body.action === "disconnectCalendar") {
    await disconnectCalendar(uid);
    return NextResponse.json({ ok: true });
  }
  if (body.action === "deleteAllData") {
    const n = await deleteAllData(uid);
    invalidateWorkspace(uid);
    return NextResponse.json({ ok: true, deleted: n });
  }
  const ok = await saveSettings(uid, {
    autoRecord: body.autoRecord as "all" | "external" | "none" | undefined,
    defaultTemplate: body.defaultTemplate as string | undefined,
    autoShare: body.autoShare as boolean | undefined,
  });
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
