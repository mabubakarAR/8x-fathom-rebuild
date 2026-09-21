import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sql = db();
  if (!sql) return NextResponse.json({ error: "no database" }, { status: 503 });
  const rows = await sql<{ status: string; error: string | null; title: string }[]>`
    select status, error, title from meetings where id = ${id}`;
  if (!rows.length) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}
