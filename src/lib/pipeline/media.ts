import "server-only";
import { put } from "@vercel/blob";
import { db, blobAuth } from "@/lib/db/client";

// Where an uploaded recording lives.
//
// This replaced a Supabase Storage client. That client was a third storage
// backend, it was never configured on any deployment, and its only effect was
// that /upload returned "Storage is not configured" — a whole page of the
// product dead behind a dependency nobody had set up.
//
// Recorded calls already had a working answer to this exact question: object
// storage when a credential exists, the database when it doesn't. Uploads now
// use the same one. One fewer service, one fewer failure mode, and a page
// that works.

/** Always true where there is a database — the fallback needs nothing else. */
export function storageConfigured(): boolean {
  return Boolean(db());
}

/** How this deployment will store an upload, for /api/setup to report. */
export function storageKind(): "blob" | "database" | "none" {
  if (blobAuth()) return "blob";
  return db() ? "database" : "none";
}

// Postgres holds the bytes when there is no object store. Opus and mp3 at
// meeting bitrates put an hour comfortably inside this.
const IN_DB_LIMIT = 40 * 1024 * 1024;

/**
 * Store the media and return the URL the player will use.
 *
 * A blob URL is absolute and served by the CDN; the database path is this
 * app's own route, which streams the bytea with range support.
 */
export async function storeMedia(
  meetingId: string,
  bytes: ArrayBuffer,
  filename: string,
  mime: string,
): Promise<string> {
  const auth = blobAuth();
  if (auth) {
    const ext =
      filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    const blob = await put(`uploads/${meetingId}.${ext}`, Buffer.from(bytes), {
      access: "public",
      contentType: mime,
      addRandomSuffix: false,
      ...auth,
    });
    return blob.url;
  }

  const sql = db();
  if (!sql) throw new Error("No database is configured, so there is nowhere to put this file");
  if (bytes.byteLength > IN_DB_LIMIT) {
    throw new Error(
      `This file is ${Math.round(bytes.byteLength / 1048576)}MB. Without an object store the limit is ${
        IN_DB_LIMIT / 1048576
      }MB — attach a Blob store, or upload a shorter recording.`,
    );
  }
  await sql`
    update meetings set media_bytes = ${Buffer.from(bytes)}, media_mime = ${mime}
    where id = ${meetingId}`;
  return `/api/calls/${meetingId}/audio`;
}

/** Read the bytes back, for the transcription step. */
export async function loadMedia(meetingId: string, url: string): Promise<ArrayBuffer> {
  if (/^https?:\/\//.test(url)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not read the stored media (${res.status})`);
    return res.arrayBuffer();
  }
  const sql = db();
  if (!sql) throw new Error("No database");
  const rows = await sql<{ media_bytes: Buffer | null }[]>`
    select media_bytes from meetings where id = ${meetingId}`;
  const b = rows[0]?.media_bytes;
  if (!b) throw new Error("No media stored for this meeting");
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}
