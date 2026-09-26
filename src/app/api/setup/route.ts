import { NextResponse } from "next/server";
import {
  migrate,
  dbConfigured,
  databaseUrlVar,
  blobTokenVar,
  blobStoreIdVar,
  blobConfigured,
  envReport,
} from "@/lib/db/client";
import { storageKind } from "@/lib/pipeline/media";
import { transcriptionConfigured } from "@/lib/pipeline/transcribe";
import { analysisConfigured } from "@/lib/pipeline/analyse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Applies the schema and reports which integrations are wired.
 *  Idempotent, so it is safe to hit after every deploy. */
export async function GET() {
  const status = {
    database: dbConfigured(),
    blob: blobConfigured(),
    transcription: transcriptionConfigured(),
    analysis: analysisConfigured(),
    // Where audio actually lands — object storage if a credential exists,
    // otherwise the database. This is the field worth reading: `blob: false`
    // on its own looks like a broken integration when it is just the other
    // branch being taken.
    audio: storageKind() === "none" ? "browser only" : storageKind(),
  };
  const env = envReport();
  if (!status.database) {
    return NextResponse.json(
      {
        ok: false,
        status,
        message:
          "No variable in this deployment holds a postgres:// URL. Storage " +
          "variables are injected at BUILD time, so a store attached after " +
          "this deployment was built will not appear in it — redeploy the " +
          "latest deployment. If env.storageish is also empty, the store is " +
          "not attached to this project/environment at all.",
        // Names only — this endpoint never returns a secret's value.
        env,
      },
      { status: 503 },
    );
  }
  const m = await migrate();
  // Row counts, so "my meetings vanished" can be told apart from "my
  // meetings are there but not mine" without a database client.
  const counts = await tableCounts();
  return NextResponse.json({
    counts,
    ok: m.ok,
    status,
    usingVar: databaseUrlVar(),
    blobVar: blobTokenVar() ?? blobStoreIdVar(),
    migration: m.message,
    env,
  });
}

async function tableCounts() {
  const { db } = await import("@/lib/db/client");
  const sql = db();
  if (!sql) return null;
  try {
    const [r] = await sql<{ users: number; meetings: number; owned: number; sample: number; ready: number }[]>`
      select (select count(*)::int from users) as users,
             (select count(*)::int from meetings) as meetings,
             (select count(*)::int from meetings where owner_id is not null) as owned,
             (select count(*)::int from meetings where sample) as sample,
             (select count(*)::int from meetings where status = 'ready') as ready`;
    return r;
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
