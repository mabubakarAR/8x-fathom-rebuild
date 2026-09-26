import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { storeMedia } from "@/lib/pipeline/media";
import { currentUserId } from "@/auth";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Stores the file and creates the row. Deliberately does no processing —
 *  the client drives transcription and analysis as separate calls so neither
 *  hits the serverless time limit. */
export async function POST(req: Request) {
  const ownerId = await currentUserId();
  if (!ownerId) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const sql = db();
  if (!sql) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file supplied" }, { status: 400 });
  if (file.size > 190 * 1024 * 1024) return NextResponse.json({ error: "File is over 190MB" }, { status: 413 });

  const templateKey = String(form.get("template") || "general");
  const id = `up-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const bytes = await file.arrayBuffer();

  await sql`
    insert into meetings (id, title, kind, platform, status, media_mime, started_at, owner_id, origin)
    values (${id}, ${file.name.replace(/\.[^.]+$/, "").slice(0, 120) || "New recording"},
            ${templateKey === "general" ? "planning" : templateKey}, 'upload', 'queued',
            ${file.type || "audio/mpeg"}, now(), ${ownerId}, 'upload')`;

  try {
    const path = await storeMedia(id, bytes, file.name, file.type || "audio/mpeg");
    await sql`update meetings set media_path = ${path} where id = ${id}`;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "upload failed";
    await sql`update meetings set status = 'failed', error = ${msg} where id = ${id}`;
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ id, templateKey });
}
