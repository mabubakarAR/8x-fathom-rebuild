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
    blob: blobConfigured(),
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
  let bucket = "skipped";
  if (status.storage) {
    try { await ensureBucket(); bucket = "ready"; }
    catch (e) { bucket = e instanceof Error ? e.message : "failed"; }
  }
  return NextResponse.json({
    ok: m.ok,
    status,
    usingVar: databaseUrlVar(),
    blobVar: blobTokenVar() ?? blobStoreIdVar(),
    migration: m.message,
    bucket,
    env,
  });
}
