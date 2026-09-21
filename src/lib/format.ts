import type { Ms } from "./types";

/** 0:00 under an hour, 1:02:03 over. Always tabular-rendered by the caller. */
export function clock(ms: Ms): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

/** "54 min", "1h 12m" — for durations in prose rather than on a scrubber. */
export function duration(ms: Ms): string {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

const DAY = 86_400_000;

/** Relative where it helps, absolute where it doesn't. */
export function when(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime();
  const diff = now - t;
  if (diff < DAY && new Date(t).getDate() === new Date(now).getDate())
    return `Today, ${timeOf(iso)}`;
  if (diff < 2 * DAY) return `Yesterday, ${timeOf(iso)}`;
  if (diff < 7 * DAY)
    return `${new Date(t).toLocaleDateString("en-GB", { weekday: "long" })}, ${timeOf(iso)}`;
  return new Date(t).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(new Date(t).getFullYear() !== new Date(now).getFullYear()
      ? { year: "numeric" }
      : {}),
  });
}

export function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/** "This week" / "Last week" / "September" — for grouping the meeting list. */
export function bucketOf(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime();
  const days = Math.floor((now - t) / DAY);
  if (days < 7) return "This week";
  if (days < 14) return "Last week";
  if (days < 31) return "Earlier this month";
  return new Date(t).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

export function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function pluralise(n: number, one: string, many = one + "s"): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Stable short token for share links. Not a security boundary — see README. */
export function shortToken(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).padStart(7, "0").slice(0, 7);
}
