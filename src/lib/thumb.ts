// Thumbnail geometry.
//
// Pure, and deliberately outside the "use client" component that draws it:
// the call list is server-rendered, so the slices have to be computable on
// the server. (Exporting this from the client component is exactly the
// mistake that produced "Attempted to call sliceMeeting() from the server".)

export interface ThumbSlice {
  /** 0..1 — how much speech is in this slice of the call. */
  v: number;
  /** Overlapping speech somewhere in this slice. */
  x?: boolean;
}

export const THUMB_BARS = 34;

/**
 * Turn a meeting's segments into a fixed number of loudness slices.
 *
 * Speaking density per slice, normalised against the call's own busiest
 * moment — which is a genuine picture of the conversation's shape rather
 * than a random walk that happens to look like audio. A call where one
 * person monologued and a call where eight people interrupted each other
 * look visibly different at thumbnail size.
 */
export function sliceMeeting(
  segments: { startMs: number; endMs: number; crosstalk?: boolean }[],
  durationMs: number,
): ThumbSlice[] {
  if (!segments.length || durationMs <= 0) {
    return Array.from({ length: THUMB_BARS }, () => ({ v: 0.12 }));
  }
  const width = durationMs / THUMB_BARS;
  const talk = new Array<number>(THUMB_BARS).fill(0);
  const over = new Array<boolean>(THUMB_BARS).fill(false);

  for (const s of segments) {
    const a = Math.max(0, Math.floor(s.startMs / width));
    const b = Math.min(THUMB_BARS - 1, Math.floor(s.endMs / width));
    for (let i = a; i <= b; i++) {
      const from = Math.max(s.startMs, i * width);
      const to = Math.min(s.endMs, (i + 1) * width);
      talk[i] += Math.max(0, to - from);
      if (s.crosstalk) over[i] = true;
    }
  }

  const peak = Math.max(...talk, 1);
  return talk.map((t, i) => ({
    // A floor, so silence still reads as a bar rather than a hole in the art.
    v: Math.max(0.1, Math.min(1, (t / peak) * 0.95)),
    x: over[i] || undefined,
  }));
}
