import type { ReactNode } from "react";
import { initials } from "@/lib/format";
import type { Person } from "@/lib/types";

/* Shared primitives. Deliberately small and unabstracted — this is a one-day
   build and a component library would cost more than it saves. */

export function speakerVar(hue: number) {
  return `var(--sp-${hue % 15})`;
}

export function Avatar({
  person,
  size = 28,
  ring = false,
  dim = false,
}: {
  person: Person;
  size?: number;
  ring?: boolean;
  dim?: boolean;
}) {
  return (
    <span
      title={`${person.name} — ${person.title}`}
      aria-hidden
      className="inline-grid shrink-0 place-items-center rounded-full font-semibold select-none"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(9, size * 0.38),
        background: speakerVar(person.hue),
        color: "white",
        opacity: dim ? 0.38 : 1,
        boxShadow: ring ? `0 0 0 2px var(--surface), 0 0 0 4px ${speakerVar(person.hue)}` : undefined,
        transition: "opacity .18s, box-shadow .18s",
      }}
    >
      {initials(person.name)}
    </span>
  );
}

export function AvatarStack({
  people,
  max = 5,
  size = 24,
}: {
  people: Person[];
  max?: number;
  size?: number;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <span className="flex items-center" aria-label={people.map((p) => p.name).join(", ")}>
      {shown.map((p, i) => (
        <span key={p.id} style={{ marginLeft: i ? -size * 0.3 : 0, zIndex: max - i }}>
          <span
            className="block rounded-full"
            style={{ boxShadow: "0 0 0 2px var(--surface)" }}
          >
            <Avatar person={p} size={size} />
          </span>
        </span>
      ))}
      {rest > 0 && (
        <span
          className="grid place-items-center rounded-full text-[10px] font-semibold tnum"
          style={{
            width: size,
            height: size,
            marginLeft: -size * 0.3,
            background: "var(--surface-2)",
            color: "var(--ink-2)",
            boxShadow: "0 0 0 2px var(--surface)",
          }}
        >
          +{rest}
        </span>
      )}
    </span>
  );
}

type Tone = "neutral" | "accent" | "ok" | "warn" | "danger" | "violet";

const TONE: Record<Tone, { bg: string; fg: string; line?: string }> = {
  neutral: { bg: "var(--surface-2)", fg: "var(--ink-2)", line: "var(--line)" },
  accent: { bg: "var(--accent-soft)", fg: "var(--accent-ink)", line: "var(--accent-line)" },
  ok: { bg: "var(--ok-soft)", fg: "var(--ok)" },
  warn: { bg: "var(--warn-soft)", fg: "var(--warn)" },
  danger: { bg: "var(--danger-soft)", fg: "var(--danger)" },
  violet: { bg: "var(--violet-soft)", fg: "var(--violet)" },
};

export function Badge({
  children,
  tone = "neutral",
  title,
}: {
  children: ReactNode;
  tone?: Tone;
  title?: string;
}) {
  const t = TONE[tone];
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[11px] font-medium whitespace-nowrap"
      style={{
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.line ?? "transparent"}`,
      }}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  className = "",
  pad = true,
}: {
  children: ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <div
      className={`rounded-[var(--radius-lg)] ${pad ? "p-4" : ""} ${className}`}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      className="text-[11px] font-semibold tracking-[0.07em] uppercase"
      style={{ color: "var(--ink-3)" }}
    >
      {children}
    </div>
  );
}

/** Horizontal talk-time bar. Reads at a glance who dominated an 8-person call. */
export function TalkBar({
  rows,
  totalMs,
}: {
  rows: { person: Person; ms: number }[];
  totalMs: number;
}) {
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
      {rows.map(({ person, ms }) => {
        const w = totalMs ? (ms / totalMs) * 100 : 0;
        if (w < 0.4) return null;
        return (
          <span
            key={person.id}
            title={`${person.name} — ${Math.round(w)}%`}
            style={{ width: `${w}%`, background: speakerVar(person.hue) }}
          />
        );
      })}
    </div>
  );
}

/* --- icons: inline, 16px grid, currentColor ------------------------------ */

const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden focusable="false">
      {PATHS[name]}
    </svg>
  );
}

export type IconName =
  | "play" | "pause" | "search" | "check" | "plus" | "share" | "chapter"
  | "sparkle" | "list" | "clip" | "home" | "chevron" | "chevronDown" | "close"
  | "sun" | "moon" | "link" | "download" | "warn" | "user" | "back" | "dot"
  | "wand" | "live" | "skipBack" | "skipFwd" | "copy" | "external" | "filter"
  | "eye" | "eye-off" | "shield" | "chart";

const PATHS: Record<IconName, ReactNode> = {
  play: <path {...S} d="M4.5 3.2v9.6l8-4.8z" />,
  pause: <g {...S}><path d="M5.5 3.5v9M10.5 3.5v9" /></g>,
  skipBack: <g {...S}><path d="M9.5 4 5 8l4.5 4z" /><path d="M12 4v8" /></g>,
  skipFwd: <g {...S}><path d="M6.5 4 11 8l-4.5 4z" /><path d="M4 4v8" /></g>,
  search: <g {...S}><circle cx="7" cy="7" r="4" /><path d="m10.2 10.2 3 3" /></g>,
  check: <path {...S} d="m3.5 8.4 2.8 2.8 6-6.4" />,
  plus: <path {...S} d="M8 3.5v9M3.5 8h9" />,
  close: <path {...S} d="m4 4 8 8M12 4l-8 8" />,
  share: <g {...S}><circle cx="12" cy="4" r="1.8" /><circle cx="4" cy="8" r="1.8" /><circle cx="12" cy="12" r="1.8" /><path d="m5.6 7.1 4.8-2.2M5.6 8.9l4.8 2.2" /></g>,
  chapter: <g {...S}><path d="M3 4h10M3 8h7M3 12h10" /></g>,
  list: <g {...S}><path d="M5.5 4h8M5.5 8h8M5.5 12h8" /><circle cx="2.8" cy="4" r=".9" fill="currentColor" stroke="none" /><circle cx="2.8" cy="8" r=".9" fill="currentColor" stroke="none" /><circle cx="2.8" cy="12" r=".9" fill="currentColor" stroke="none" /></g>,
  sparkle: <path {...S} d="M8 2.2 9.3 6 13 7.3 9.3 8.6 8 12.4 6.7 8.6 3 7.3 6.7 6z" />,
  wand: <g {...S}><path d="m3 13 7-7" /><path d="M11 2.5 11.7 4l1.5.7-1.5.7-.7 1.5-.7-1.5L8.8 4.7l1.5-.7z" /></g>,
  clip: <g {...S}><rect x="2.5" y="4" width="11" height="8" rx="1.6" /><path d="M6.5 6.6v2.8l2.6-1.4z" /></g>,
  home: <path {...S} d="M3 7.2 8 3l5 4.2V13H3z" />,
  chevron: <path {...S} d="m6.2 3.5 4.3 4.5-4.3 4.5" />,
  chevronDown: <path {...S} d="m3.5 6.2 4.5 4.3 4.5-4.3" />,
  back: <g {...S}><path d="M12.5 8h-9" /><path d="m6.8 4.2-3.3 3.8 3.3 3.8" /></g>,
  sun: <g {...S}><circle cx="8" cy="8" r="2.8" /><path d="M8 1.6v1.5M8 12.9v1.5M1.6 8h1.5M12.9 8h1.5M3.5 3.5l1 1M11.5 11.5l1 1M12.5 3.5l-1 1M4.5 11.5l-1 1" /></g>,
  moon: <path {...S} d="M12.8 9.6A5.2 5.2 0 0 1 6.4 3.2a5.2 5.2 0 1 0 6.4 6.4z" />,
  link: <g {...S}><path d="M6.6 9.4a2.6 2.6 0 0 0 3.7 0l2-2a2.6 2.6 0 1 0-3.7-3.7l-.8.8" /><path d="M9.4 6.6a2.6 2.6 0 0 0-3.7 0l-2 2a2.6 2.6 0 1 0 3.7 3.7l.8-.8" /></g>,
  download: <g {...S}><path d="M8 2.8v7M5.2 7.2 8 10l2.8-2.8" /><path d="M3 12.4h10" /></g>,
  copy: <g {...S}><rect x="5.5" y="5.5" width="7.5" height="7.5" rx="1.4" /><path d="M10.5 3.5H4.2A1.2 1.2 0 0 0 3 4.7v6.1" /></g>,
  warn: <g {...S}><path d="M8 2.8 14 13H2z" /><path d="M8 6.6v2.8" /><circle cx="8" cy="11.2" r=".7" fill="currentColor" stroke="none" /></g>,
  user: <g {...S}><circle cx="8" cy="5.5" r="2.4" /><path d="M3.4 13a4.7 4.7 0 0 1 9.2 0" /></g>,
  dot: <circle cx="8" cy="8" r="3" fill="currentColor" />,
  live: <g><circle cx="8" cy="8" r="3" fill="currentColor" /><circle cx="8" cy="8" r="6" {...S} opacity=".45" /></g>,
  external: <g {...S}><path d="M9 3.5h3.5V7" /><path d="m12.5 3.5-5 5" /><path d="M11 9.5v3H3.5V5h3" /></g>,
  filter: <path {...S} d="M2.5 4h11l-4.2 4.6v3.6l-2.6 1.3V8.6z" />,
  eye: <g {...S}><path d="M1.6 8S4 3.8 8 3.8 14.4 8 14.4 8 12 12.2 8 12.2 1.6 8 1.6 8z" /><circle cx="8" cy="8" r="2" /></g>,
  "eye-off": <g {...S}><path d="M6.3 4.1A6 6 0 0 1 8 3.8C12 3.8 14.4 8 14.4 8a11 11 0 0 1-2 2.5M4.2 5.3A11 11 0 0 0 1.6 8S4 12.2 8 12.2c.7 0 1.3-.1 1.9-.3" /><path d="m2.6 2.6 10.8 10.8" /></g>,
  chart: <g {...S}><path d="M2.8 13h10.4" /><path d="M4.6 13V8.4M7.6 13V4.6M10.6 13V6.8" /></g>,
  shield: <g {...S}><path d="M8 2.2 13 4v4c0 3-2.2 5-5 5.8C5.2 13 3 11 3 8V4z" /><path d="m5.9 7.9 1.5 1.5 2.9-3" /></g>,
};
