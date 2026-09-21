"use client";

import { useMemo } from "react";
import type { ThumbSlice } from "@/lib/thumb";

export type { ThumbSlice };
export { sliceMeeting } from "@/lib/thumb";

/** Stable 0..1 from a string, so a meeting keeps its colour forever and the
 *  grid stays recognisable between visits. */
function hash01(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

// The call thumbnail.
//
// Fathom's call list is a grid of tiles: a coloured gradient with a white
// waveform across it, a duration badge, the title underneath. It reads as a
// library of recordings. A list of text rows — which is what this build had —
// reads as a database table with a stylesheet, and that difference is most of
// why one looks like a product and the other looks like an exercise.
//
// The waveform is not decoration. Each bar is the real speaking density of
// that slice of that meeting, so a call where one person monologued and a
// call where eight people interrupted each other genuinely look different at
// thumbnail size. The gradient is derived from the meeting id, so a given
// call is always the same colour and the grid stays recognisable.

export function CallThumb({
  id,
  slices,
  duration,
  live,
  className,
}: {
  id: string;
  slices: ThumbSlice[];
  duration: string;
  /** Recorded or analysed for real, rather than seeded. */
  live?: boolean;
  className?: string;
}) {
  const { from, to } = useMemo(() => {
    // Warm hues for the grid, spaced off the id. Fathom's tiles sit in the
    // coral-to-violet range and the warmth is what stops a dark app feeling
    // like a terminal.
    const h = 18 + hash01(id) * 300;
    return {
      from: `oklch(64% 0.16 ${h})`,
      to: `oklch(52% 0.17 ${(h + 42) % 360})`,
    };
  }, [id]);

  return (
    <div
      className={`relative aspect-[16/9] w-full overflow-hidden rounded-[var(--radius)] ${className ?? ""}`}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      <div className="absolute inset-0 flex items-center justify-center gap-[2px] px-[7%]">
        {slices.map((s, i) => (
          <span
            key={i}
            className="flex-1 rounded-full"
            style={{
              height: `${12 + s.v * 62}%`,
              background: s.x ? "oklch(92% 0.13 85)" : "oklch(100% 0 0)",
              opacity: s.x ? 0.95 : 0.82,
            }}
          />
        ))}
      </div>

      {live && (
        <span
          className="absolute top-2 left-2 rounded-[5px] px-1.5 py-[2px] text-[10px] font-semibold tracking-[0.03em] uppercase"
          style={{ background: "oklch(18% 0.02 258 / .78)", color: "oklch(98% 0 0)" }}
        >
          Real
        </span>
      )}

      <span
        className="absolute right-2 bottom-2 rounded-[5px] px-1.5 py-[2px] text-[11px] font-medium tnum"
        style={{ background: "oklch(18% 0.02 258 / .78)", color: "oklch(98% 0 0)" }}
      >
        {duration}
      </span>
    </div>
  );
}
