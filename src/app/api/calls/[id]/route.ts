import { NextResponse } from "next/server";
import { loadCall } from "@/lib/db/calls";
import { db } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One saved call, in the shape the meeting UI already renders. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const call = await loadCall(id);
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
  const sql = db();
  if (!sql) return NextResponse.json({ error: "No database" }, { status: 503 });
  const rows = await sql`delete from meetings where id = ${id} returning id`;
  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ deleted: id });
}
