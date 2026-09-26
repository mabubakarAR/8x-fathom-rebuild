import { NextResponse } from "next/server";
import { loadCall } from "@/lib/db/calls";
import { db } from "@/lib/db/client";
import { currentUserId } from "@/auth";
import { invalidateWorkspace } from "@/lib/data/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One saved call, in the shape the meeting UI already renders. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const call = await loadCall(id, uid);
  if (!call) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(call);
}

/**
 * Delete a call.
 *
 * Every child table cascades off `meetings`, so one delete is the whole
 * cleanup — transcript, speakers, summary, actions, highlights, the evidence
 * ledger and the stored audio all go together. There is no soft-delete and no
 * trash: a recording someone asked to remove should actually be gone.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const sql = db();
  if (!sql) return NextResponse.json({ error: "No database" }, { status: 503 });
  // Ownership is in the WHERE clause, not a check before it: a meeting you
  // do not own is indistinguishable from one that does not exist.
  const rows = await sql`delete from meetings where id = ${id} and owner_id = ${uid} returning id`;
  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  invalidateWorkspace(uid);
  return NextResponse.json({ deleted: id });
}
