"use client";

import { useMemo } from "react";
import type { ThumbSlice } from "@/lib/thumb";

export type { ThumbSlice };
export { sliceMeeting } from "@/lib/thumb";

// The call tile.
//
// Fathom's list is a grid of gradient tiles with a white waveform on each.
// This does the same thing but with the waveform carrying information: every
// bar is coloured by whoever held the floor in that slice of the call, so at
// thumbnail size a 1:1 reads as two colours trading, a demo reads as one
// colour with a tail of questions, and an eight-way argument reads as
// confetti. You can tell the calls apart before reading a single title.
//
// Mirrored around the centre line, because that is what a waveform is, and
// because the symmetry is what makes forty-four bars read as one object
// rather than a bar chart.

/** Stable 0..1 from a string, so a meeting keeps its backdrop forever. */
function hash01(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

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
  // The backdrop is deep and desaturated on purpose: the speaker colours are
  // the subject, and a loud gradient behind them turns the whole grid into
  // noise. Hue is keyed off the id so a call is always recognisable.
  const bg = useMemo(() => {
    const h = 200 + hash01(id) * 150;
    return `linear-gradient(145deg, oklch(30% 0.085 ${h}), oklch(17% 0.055 ${(h + 55) % 360}))`;
  }, [id]);

  const solo = useMemo(() => new Set(slices.map((s) => s.h)).size <= 2, [slices]);

  return (
    <div
      className={`relative aspect-[16/10] w-full overflow-hidden rounded-[var(--radius)] ${className ?? ""}`}
      style={{ background: bg }}
    >
      {/* Light from the top-left, so the tile reads as a lit surface. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 8% 0%, oklch(100% 0 0 / .14), transparent 60%)",
        }}
      />

      <div className="absolute inset-0 flex items-center gap-[1.5px] px-[6%]">
        {slices.map((s, i) => {
          const colour =
            s.x
              ? "oklch(84% 0.15 78)"
              : s.h >= 0
                ? `var(--sp-${s.h})`
                : "oklch(100% 0 0 / .28)";
          // Mirrored: the bar grows equally above and below the centre.
          const h = 7 + s.v * (solo ? 70 : 84);
          return (
            <span
              key={i}
              className="flex-1 rounded-full"
              style={{
                height: `${h}%`,
                background: colour,
                opacity: s.h >= 0 || s.x ? 0.94 : 1,
              }}
            />
          );
        })}
      </div>

      {/* Bottom scrim so the duration chip always has contrast under it. */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3"
        style={{ background: "linear-gradient(to top, oklch(0% 0 0 / .45), transparent)" }}
      />

      {live && (
        <span
          className="absolute top-2 left-2 rounded-[5px] px-1.5 py-[2px] text-[10px] font-semibold tracking-[0.04em] uppercase"
          style={{ background: "oklch(100% 0 0 / .92)", color: "oklch(14% 0 0)" }}
        >
          Real
        </span>
      )}

      <span
        className="absolute right-2 bottom-2 rounded-[5px] px-1.5 py-[2px] text-[11px] font-semibold tnum"
        style={{ background: "oklch(8% 0 0 / .62)", color: "oklch(99% 0 0)" }}
      >
        {duration}
      </span>
    </div>
  );
}
