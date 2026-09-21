import { NextResponse } from "next/server";
import { migrate, dbConfigured, databaseUrlVar, envReport } from "@/lib/db/client";
import { storageConfigured, ensureBucket } from "@/lib/pipeline/ingest";
import { transcriptionConfigured } from "@/lib/pipeline/transcribe";
import { analysisConfigured } from "@/lib/pipeline/analyse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Applies the schema and reports which integrations are wired.
 *  Idempotent, so it is safe to hit after every deploy. */
export async function GET() {
  const status = {
    database: dbConfigured(),
    blob: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    storage: storageConfigured(),
    transcription: transcriptionConfigured(),
    analysis: analysisConfigured(),
  };
  const env = envReport();
  if (!status.database) {
    return NextResponse.json(
      {
        ok: false,
        status,
        message:
          "No Postgres connection string in this deployment's environment. " +
          "If the database is attached in Vercel, redeploy so the variable is injected.",
        // Names only — this endpoint never returns a secret's value.
        env,
      },
      { status: 503 },
    );
  }
  const m = await migrate();
  let bucket = "skipped";
  if (status.storage) {
    try { await ensureBucket(); bucket = "ready"; }
    catch (e) { bucket = e instanceof Error ? e.message : "failed"; }
  }
  return NextResponse.json({
    ok: m.ok,
    status,
    usingVar: databaseUrlVar(),
    migration: m.message,
    bucket,
    env,
  });
}
