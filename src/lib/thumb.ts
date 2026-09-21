// Thumbnail geometry.
//
// Pure, and deliberately outside the "use client" component that draws it:
// the call list is server-rendered, so the slices have to be computable on
// the server. (Exporting this from the client component is exactly the
// mistake that produced "Attempted to call sliceMeeting() from the server".)
//
// What a tile is for: at 280px wide you cannot read a title fast enough to
// tell six calls apart, but you can recognise a *shape*. So the thumbnail is
// the conversation's shape — how loud, and crucially WHO. Each bar is
// coloured by the person who actually held the floor in that slice, which
// means a 1:1 reads as two colours trading, a presentation reads as one
// colour with a tail of questions, and an eight-way argument reads as
// confetti. None of that is decoration; it is the only genuinely useful
// thing a thumbnail of audio can tell you.

export interface ThumbSlice {
  /** 0..1 — how much speech is in this slice of the call. */
  v: number;
  /** Speaker hue index of whoever held the floor here, or -1 for silence. */
  h: number;
  /** Overlapping speech somewhere in this slice. */
  x?: boolean;
}

export const THUMB_BARS = 44;

interface Seg {
  startMs: number;
  endMs: number;
  crosstalk?: boolean;
  /** Speaker palette index, 0-14. */
  hue?: number;
}

/**
 * Turn a meeting's segments into fixed-width slices.
 *
 * Density is normalised against the call's own busiest moment rather than an
 * absolute, so a quiet 1:1 and a loud all-hands both use the full height and
 * stay comparable to themselves. The dominant speaker per slice is whoever
 * spoke for the most milliseconds in it — not whoever started it, which
 * would let a one-word interjection recolour a whole bar.
 */
export function sliceMeeting(segments: Seg[], durationMs: number): ThumbSlice[] {
  if (!segments.length || durationMs <= 0) {
    return Array.from({ length: THUMB_BARS }, () => ({ v: 0.1, h: -1 }));
  }
  const width = durationMs / THUMB_BARS;
  const talk = new Array<number>(THUMB_BARS).fill(0);
  const over = new Array<boolean>(THUMB_BARS).fill(false);
  const byHue: Map<number, number>[] = Array.from({ length: THUMB_BARS }, () => new Map());

  for (const s of segments) {
    const a = Math.max(0, Math.floor(s.startMs / width));
    const b = Math.min(THUMB_BARS - 1, Math.floor(s.endMs / width));
    for (let i = a; i <= b; i++) {
      const from = Math.max(s.startMs, i * width);
      const to = Math.min(s.endMs, (i + 1) * width);
      const ms = Math.max(0, to - from);
      talk[i] += ms;
      if (s.crosstalk) over[i] = true;
      if (typeof s.hue === "number") {
        byHue[i].set(s.hue, (byHue[i].get(s.hue) ?? 0) + ms);
      }
    }
  }

  // Normalising against the single loudest slice flattens everything else:
  // in a busy meeting almost every slice is near the max, so every bar comes
  // out the same height and the waveform reads as a solid block. Normalise
  // against a high percentile instead and let the loudest few clip, then
  // apply a gentle curve — that is what gives the shape any dynamic range.
  const sorted = [...talk].sort((a, b) => a - b);
  const p85 = sorted[Math.floor(sorted.length * 0.85)] || Math.max(...talk, 1);
  const floorMs = sorted[Math.floor(sorted.length * 0.15)] || 0;
  const span = Math.max(1, p85 - floorMs);

  return talk.map((t, i) => {
    let h = -1;
    let best = 0;
    for (const [hue, ms] of byHue[i]) {
      if (ms > best) {
        best = ms;
        h = hue;
      }
    }
    const norm = Math.min(1, Math.max(0, (t - floorMs) / span));
    return {
      // A floor, so silence still reads as a bar rather than a hole in the art.
      v: Math.max(0.06, Math.pow(norm, 0.78)),
      h,
      x: over[i] || undefined,
    };
  });
}
