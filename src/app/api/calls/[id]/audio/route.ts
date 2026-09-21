import { db } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The recording, served out of Postgres.
 *
 * Only used when no object store is attached. It is deliberately a separate
 * route rather than a field on the call payload: the meeting JSON is fetched
 * on every open and must stay small, while the audio is fetched once, by an
 * <audio> element, and wants its own cache headers and range support.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sql = db();
  if (!sql) return new Response("No database", { status: 503 });

  const rows = await sql`
    select media_bytes, media_mime from meetings where id = ${id}`;
  const row = rows[0];
  const bytes = row?.media_bytes as Buffer | null | undefined;
  if (!bytes || bytes.length === 0) {
    return new Response("No audio stored for this call", { status: 404 });
  }

  const type = (row?.media_mime as string) || "audio/webm";
  const total = bytes.length;

  // Safari will not scrub — or in some versions even play — a media file
  // served without range support, so answer the range request properly
  // instead of always sending the whole body.
  const range = req.headers.get("range");
  const m = range?.match(/bytes=(\d*)-(\d*)/);
  if (m) {
    const start = m[1] ? Number(m[1]) : 0;
    const end = m[2] ? Math.min(Number(m[2]), total - 1) : total - 1;
    if (Number.isFinite(start) && start <= end && start >= 0) {
      const slice = bytes.subarray(start, end + 1);
      return new Response(new Uint8Array(slice), {
        status: 206,
        headers: {
          "content-type": type,
          "content-length": String(slice.length),
          "content-range": `bytes ${start}-${end}/${total}`,
          "accept-ranges": "bytes",
          "cache-control": "private, max-age=3600",
        },
      });
    }
  }

  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": type,
      "content-length": String(total),
      "accept-ranges": "bytes",
      "cache-control": "private, max-age=3600",
    },
  });
}
