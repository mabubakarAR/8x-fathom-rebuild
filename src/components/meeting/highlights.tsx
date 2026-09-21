"use client";

import { useOverlay } from "@/lib/overlay";
import { clock } from "@/lib/format";
import type { Highlight, HighlightCategory, Person } from "@/lib/types";
import { Avatar, Icon } from "../ui";
import { mapTone } from "./transcript";

interface Props {
  meetingId: string;
  highlights: Highlight[];
  categories: HighlightCategory[];
  people: Map<string, Person>;
  currentMs: number;
  onSeek: (ms: number, opts?: { play?: boolean }) => void;
  onShare: (r: { startMs: number; endMs: number; title: string }) => void;
}

export function HighlightsPane({
  highlights,
  categories,
  people,
  currentMs,
  onSeek,
  onShare,
}: Props) {
  const overlay = useOverlay();
  const byKey = new Map(categories.map((c) => [c.key, c]));

  if (!highlights.length) {
    return (
      <div className="p-6 text-center">
        <p className="text-[13px] font-medium" style={{ color: "var(--ink-2)" }}>
          No clips yet
        </p>
        <p className="mx-auto mt-1.5 max-w-[30ch] text-[12.5px] leading-relaxed" style={{ color: "var(--ink-3)" }}>
          Hover any transcript line and press the blue <strong>+</strong> in the gutter. Drag the
          range to cover as many lines as you need.
        </p>
      </div>
    );
  }

  return (
    <div className="p-3">
      <ul className="flex flex-col gap-1.5">
        {highlights.map((h) => {
          const cat = byKey.get(h.categoryKey);
          const tone = mapTone(cat?.color ?? "sky");
          const author = people.get(h.createdById);
          const playing = currentMs >= h.startMs && currentMs <= h.endMs;
          return (
            <li key={h.id}>
              <div
                className="group rounded-[var(--radius)] p-2.5 transition-colors"
                style={{
                  background: playing ? "var(--accent-soft)" : "var(--surface-2)",
                  border: `1px solid ${playing ? "var(--accent-line)" : "transparent"}`,
                }}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className="rounded-full px-2 py-[2px] text-[10.5px] font-semibold"
                    style={{ background: `var(--${tone}-soft)`, color: `var(--${tone})` }}
                  >
                    {cat?.label ?? h.categoryKey}
                  </span>
                  <span className="text-[11px] tnum" style={{ color: "var(--ink-faint)" }}>
                    {clock(h.startMs)} · {Math.round((h.endMs - h.startMs) / 1000)}s
                  </span>
                  <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <button
                      onClick={() => onShare({ startMs: h.startMs, endMs: h.endMs, title: h.title })}
                      aria-label="Share this clip"
                      className="grid h-6 w-6 place-items-center rounded-[6px]"
                      style={{ color: "var(--ink-3)" }}
                    >
                      <Icon name="share" size={13} />
                    </button>
                    <button
                      onClick={() => overlay.removeHighlight(h.id)}
                      aria-label="Delete this clip"
                      className="grid h-6 w-6 place-items-center rounded-[6px]"
                      style={{ color: "var(--ink-3)" }}
                    >
                      <Icon name="close" size={13} />
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => onSeek(h.startMs, { play: true })}
                  className="block w-full text-left text-[13px] leading-snug font-medium"
                  style={{ color: "var(--ink)" }}
                >
                  {h.title}
                </button>

                {h.note && (
                  <p className="mt-1 text-[12px] leading-relaxed" style={{ color: "var(--ink-3)" }}>
                    {h.note}
                  </p>
                )}

                {author && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px]" style={{ color: "var(--ink-faint)" }}>
                    <Avatar person={author} size={14} />
                    clipped by {author.name.split(" ")[0]}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
