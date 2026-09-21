import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { dbConfigured, blobAuth } from "@/lib/db/client";
import { saveCall, type SaveCallInput } from "@/lib/db/calls";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Persist a finished call.
 *
 * Multipart rather than JSON, because the audio comes along with it: the
 * blob goes to Vercel Blob and its public URL is stored on the row, so
 * playback later is a plain <audio src> with no signing round-trip.
 *
 * Partial success is a real outcome and is reported as one. If the audio
 * uploads but the database write fails, the caller still has its local copy
 * and is told exactly what went wrong — losing a recording somebody just
 * spent ten minutes making because one of two writes failed is not
 * acceptable, and neither is claiming it saved when it did not.
 */
export async function POST(req: Request) {
  if (!dbConfigured()) {
    return NextResponse.json(
      { error: "No database is connected, so this call can only live in your browser. Check /api/setup." },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const metaRaw = form.get("meta");
  if (typeof metaRaw !== "string") {
    return NextResponse.json({ error: "Missing meta" }, { status: 400 });
  }

  let meta: Omit<SaveCallInput, "mediaUrl" | "mediaMime">;
  try {
    meta = JSON.parse(metaRaw);
  } catch {
    return NextResponse.json({ error: "meta is not valid JSON" }, { status: 400 });
  }
  if (!meta?.id || !Array.isArray(meta.segments) || !meta.analysis) {
    return NextResponse.json({ error: "meta is incomplete" }, { status: 400 });
  }

  // ---- the audio ----------------------------------------------------------
  let mediaUrl: string | null = null;
  let mediaMime: string | null = null;
  let audioWarning: string | null = null;

  const audio = form.get("audio");
  if (audio instanceof File && audio.size > 0) {
    // Either a read-write token (older stores) or a store id authenticated by
    // the deployment's OIDC token (newer ones). The call site doesn't care.
    const auth = blobAuth();
    if (!auth) {
      audioWarning =
        "No Blob store is connected, so the audio stayed in your browser. The transcript and notes are saved.";
    } else {
      try {
        const ext = (audio.type.split("/")[1] || "webm").split(";")[0];
        const blob = await put(`calls/${meta.id}.${ext}`, audio, {
          access: "public",
          contentType: audio.type || "audio/webm",
          addRandomSuffix: false,
          // Passed explicitly rather than relying on the SDK's default
          // lookup, because a store attached with a prefix lands under a name
          // the SDK never looks at.
          ...auth,
        });
        mediaUrl = blob.url;
        mediaMime = audio.type || "audio/webm";
      } catch (e) {
        audioWarning = `The audio could not be uploaded (${
          e instanceof Error ? e.message : String(e)
        }), so playback will only work in this browser. The transcript and notes are saved.`;
      }
    }
  }

  // ---- the meeting --------------------------------------------------------
  const saved = await saveCall({ ...meta, mediaUrl, mediaMime });
  if (!saved.ok) {
    return NextResponse.json(
      {
        error: `Saved nothing: ${saved.reason}`,
        // Say plainly that an uploaded blob is now orphaned rather than
        // pretending the whole operation was clean.
        orphanedAudio: mediaUrl,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: meta.id, mediaUrl, warning: audioWarning });
}
