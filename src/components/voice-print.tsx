"use client";

import { useEffect, useRef } from "react";

// The voice print.
//
// The hero image is not decoration and it is not stock. It is the actual
// speaker-lane data from the 54-minute, eight-person call in the demo
// workspace — the same array the meeting page draws its minimap from —
// streaming past a playhead.
//
// Which means the thing that makes the landing page look like something is
// the same thing that makes the product worth using: an hour of eight people
// talking has a *shape*, and this product's whole argument is that you should
// be able to see it before you read a word. Using it as the hero is the
// cheapest possible way to say that, and the only honest one.
//
// Amber bars are real crosstalk. The gaps are real silence. Nothing here is
// generated to look good.

export interface Lane {
  /** Speaker index, 0-based. */
  l: number;
  /** Start and end, in seconds from the top of the call. */
  s: number;
  e: number;
  /** Overlapping speech. */
  x?: 1;
}

const LANES = 8;
const PX_PER_SEC = 4.2;    // ~6 minutes of the call on screen at once
const TICK = 3;            // one waveform tick every 3px
const SPEED = 15;          // px/sec of scroll — slow enough to read as deliberate
const PLAYHEAD = 0.74;   // right of the copy column, where it can be seen

/** Deterministic 0..1 from an integer. Tick heights must not reshuffle every
 *  frame, and must be identical on every reload — the artwork is data, so it
 *  should not shimmer. */
function hash01(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function VoicePrint({ lanes, className }: { lanes: Lane[]; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    // Colours come from the live CSS variables, so the canvas follows the
    // theme toggle instead of hard-coding a palette that goes wrong in light
    // mode.
    const css = getComputedStyle(document.documentElement);
    const v = (n: string, fallback: string) => css.getPropertyValue(n).trim() || fallback;
    const hues = Array.from({ length: LANES }, (_, i) => v(`--sp-${i}`, "#5b8def"));
    const amber = v("--warn", "#e0a33e");
    const accent = v("--accent", "#00beff");

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const totalSec = lanes.reduce((m, b) => Math.max(m, b.e), 0) || 1;
    const loopPx = totalSec * PX_PER_SEC;

    let raf = 0;
    let w = 0;
    let h = 0;
    let dpr = 1;

    function resize() {
      if (!cv) return;
      const r = cv.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width;
      h = r.height;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    const start = performance.now();

    function frame(now: number) {
      if (!ctx) return;
      const offset = reduced ? loopPx * 0.18 : ((now - start) / 1000) * SPEED;
      // The lane stack is a fixed band centred in the canvas rather than the
      // full height. Eight lanes spread over 700px is mostly empty space; the
      // same eight packed into 300 reads as one instrument.
      const band = Math.min(h * 0.86, 300);
      const top = (h - band) / 2;
      const laneH = band / LANES;
      const maxTick = laneH * 0.92;
      const headX = w * PLAYHEAD;

      ctx.clearRect(0, 0, w, h);

      // Lane guides — a hairline each, so a scatter of ticks reads as eight
      // voices on eight tracks rather than confetti.
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = v("--line", "#2a2a33");
      for (let i = 0; i < LANES; i++) {
        ctx.fillRect(0, Math.round(top + i * laneH + laneH / 2) + 0.5, w, 1);
      }
      ctx.globalAlpha = 1;

      // The voice print itself. Each spoken turn is drawn as a run of ticks
      // of varying height — which is what a voice looks like, and what a flat
      // bar conspicuously does not.
      let seed = 0;
      for (const b of lanes) {
        if (b.l >= LANES) continue;
        const cy = top + b.l * laneH + laneH / 2;
        const colour = b.x ? amber : hues[b.l];
        // Three copies, not two. With only [0, +loop] the left of the canvas
        // renders negative time — i.e. nothing — until the scroll has run for
        // a couple of minutes. The -loop copy puts the tail of the call there
        // from the first frame, which is what makes the seam invisible.
        for (const rep of [-loopPx, 0, loopPx]) {
          const x0 = headX + b.s * PX_PER_SEC + rep - (offset % loopPx);
          const bw = Math.max(TICK, (b.e - b.s) * PX_PER_SEC);
          if (x0 > w || x0 + bw < 0) continue;

          ctx.fillStyle = colour;
          const n = Math.ceil(bw / TICK);
          for (let i = 0; i < n; i++) {
            const x = x0 + i * TICK;
            if (x < -TICK || x > w) continue;
            // Taper the ends so a turn has an attack and a decay.
            const t = n > 1 ? i / (n - 1) : 0.5;
            const env = Math.sin(Math.PI * Math.min(1, Math.max(0, t))) * 0.55 + 0.45;
            const amp = (0.22 + hash01(seed + i) * 0.78) * env;
            const th = Math.max(2, maxTick * amp);

            const d = Math.abs(x - headX);
            const near = Math.max(0, 1 - d / (w * 0.3));
            ctx.globalAlpha = 0.42 + near * 0.58;
            ctx.shadowBlur = near * 16;
            ctx.shadowColor = colour;
            roundRect(ctx, x, cy - th / 2, TICK - 1.1, th, (TICK - 1.1) / 2);
            ctx.fill();
          }
        }
        seed += 977;
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      // Playhead.
      const bandTop = Math.max(0, top - 26);
      const bandH = Math.min(h - bandTop, band + 52);
      const g = ctx.createLinearGradient(0, bandTop, 0, bandTop + bandH);
      g.addColorStop(0, "transparent");
      g.addColorStop(0.5, accent);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.shadowBlur = 22;
      ctx.shadowColor = accent;
      ctx.fillRect(headX - 1, bandTop, 2, bandH);
      ctx.shadowBlur = 0;
      // A soft bloom either side of the line, so the "now" reads as a place
      // the sound is passing through rather than a divider.
      const bloom = ctx.createLinearGradient(headX - 90, 0, headX + 90, 0);
      bloom.addColorStop(0, "transparent");
      bloom.addColorStop(0.5, accent);
      bloom.addColorStop(1, "transparent");
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = bloom;
      ctx.fillRect(headX - 90, bandTop, 180, bandH);
      ctx.globalAlpha = 1;

      if (!reduced) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [lanes]);

  return (
    <canvas
      ref={ref}
      className={className}
      aria-hidden
      // The picture is data, not information — the same facts are in the
      // meeting page as text. Hiding it from screen readers is correct.
    />
  );
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + rr, y);
  c.arcTo(x + w, y, x + w, y + h, rr);
  c.arcTo(x + w, y + h, x, y + h, rr);
  c.arcTo(x, y + h, x, y, rr);
  c.arcTo(x, y, x + w, y, rr);
  c.closePath();
}
