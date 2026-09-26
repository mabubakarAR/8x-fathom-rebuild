import "server-only";
import { db } from "@/lib/db/client";
import type { Platform } from "@/lib/types";

// Google Calendar, read for real.
//
// The refresh token was stored at sign-in. Each read exchanges it for a
// short-lived access token and pulls the next seven days of events. That is
// the whole integration — no webhooks, no sync table — because for a
// notetaker the calendar is a *view*, not a copy: it needs to be right at the
// moment you look at it and never needs to be right when you don't.
//
// What the product actually does with it is decide, per meeting, whether to
// record — and say why. That decision is the rule below, not the model, and
// it is shown next to every meeting so it can be overridden before it
// matters rather than discovered afterwards.

export type CaptureMode = "off" | "transcript" | "audio" | "full";

export interface UpcomingMeeting {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  startsInMinutes: number;
  durationMin: number;
  platform: Platform | "unknown";
  joinUrl: string | null;
  attendees: { email: string; name: string; self: boolean; external: boolean }[];
  defaultCapture: CaptureMode;
  reason: string;
  recurring: boolean;
}

interface Tokens { access_token: string; expires_in: number }

async function accessToken(refreshToken: string): Promise<string | null> {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: id,
      client_secret: secret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const j = (await res.json()) as Tokens;
  return j.access_token ?? null;
}

interface GEvent {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  hangoutLink?: string;
  location?: string;
  description?: string;
  recurringEventId?: string;
  attendees?: { email: string; displayName?: string; self?: boolean; responseStatus?: string }[];
  conferenceData?: { entryPoints?: { entryPointType: string; uri: string }[] };
}

const MEET = /meet\.google\.com\/[a-z-]+/i;
const ZOOM = /zoom\.us\/j\/\d+/i;
const TEAMS = /teams\.microsoft\.com\/l\/meetup-join/i;

function joinLink(e: GEvent): { url: string | null; platform: Platform | "unknown" } {
  const candidates = [
    e.hangoutLink,
    ...(e.conferenceData?.entryPoints ?? []).filter((p) => p.entryPointType === "video").map((p) => p.uri),
    e.location,
    e.description,
  ].filter((x): x is string => Boolean(x));
  for (const c of candidates) {
    const m = c.match(MEET); if (m) return { url: "https://" + m[0], platform: "meet" };
    const z = c.match(ZOOM); if (z) return { url: "https://" + z[0], platform: "zoom" };
    const t = c.match(TEAMS); if (t) return { url: c.match(/https?:\/\/\S+/)?.[0] ?? null, platform: "teams" };
  }
  return { url: null, platform: "unknown" };
}

/** The recording rule. Deterministic and stated, never a model call. */
function decide(e: GEvent, external: number, attendees: number, hasLink: boolean, rule: string): { mode: CaptureMode; reason: string } {
  if (!hasLink) return { mode: "off", reason: "No video link on the invite" };
  if (rule === "none") return { mode: "off", reason: "Your setting: nothing automatically" };
  if (rule === "external" && external === 0) return { mode: "off", reason: "Your setting: external meetings only" };
  if (external > 0) return { mode: "full", reason: `${external} external ${external === 1 ? "guest" : "guests"} on the invite` };
  if (attendees <= 2) return { mode: "audio", reason: "Two-person internal" };
  if (e.recurringEventId) return { mode: "transcript", reason: "Recurring internal — transcript is enough" };
  return { mode: "audio", reason: "Internal meeting" };
}

export async function upcomingMeetings(ownerId: string, days = 7): Promise<{ ok: true; meetings: UpcomingMeeting[] } | { ok: false; reason: string }> {
  const sql = db();
  if (!sql) return { ok: false, reason: "No database" };
  const rows = await sql<{ google_refresh_token: string | null; email: string; auto_record: string }[]>`
    select google_refresh_token, email, auto_record from users where id = ${ownerId}`;
  const rt = rows[0]?.google_refresh_token;
  if (!rt) return { ok: false, reason: "Calendar not connected" };
  const token = await accessToken(rt);
  if (!token) return { ok: false, reason: "Google refused the refresh token — sign in again to reconnect" };

  const now = new Date();
  const max = new Date(now.getTime() + days * 86_400_000);
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", now.toISOString());
  url.searchParams.set("timeMax", max.toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "40");
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!res.ok) return { ok: false, reason: `Calendar API ${res.status}` };
  const j = (await res.json()) as { items?: GEvent[] };

  const myDomain = (rows[0]?.email ?? "").split("@")[1] ?? "";
  const out: UpcomingMeeting[] = [];
  for (const e of j.items ?? []) {
    const startIso = e.start?.dateTime;
    const endIso = e.end?.dateTime;
    if (!startIso || !endIso) continue; // all-day events aren't meetings
    const start = new Date(startIso);
    const end = new Date(endIso);
    const attendees = (e.attendees ?? []).map((a) => {
      const dom = a.email.split("@")[1] ?? "";
      const consumer = /gmail\.com|googlemail\.com|outlook\.com|hotmail\.com|yahoo\.com|icloud\.com/i.test(dom);
      return {
        email: a.email,
        name: a.displayName || a.email.split("@")[0],
        self: Boolean(a.self),
        // Same domain as you is internal; a different company domain is a
        // guest. Consumer mail domains can't be told apart, so they count
        // as internal rather than triggering "record everything".
        external: !a.self && dom !== myDomain && !consumer,
      };
    });
    const external = attendees.filter((a) => a.external).length;
    const { url: joinUrl, platform } = joinLink(e);
    const { mode, reason } = decide(e, external, Math.max(1, attendees.length), Boolean(joinUrl), rows[0]?.auto_record ?? "all");
    out.push({
      id: e.id,
      title: e.summary || "(no title)",
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      startsInMinutes: Math.round((start.getTime() - now.getTime()) / 60000),
      durationMin: Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000)),
      platform,
      joinUrl,
      attendees,
      defaultCapture: mode,
      reason,
      recurring: Boolean(e.recurringEventId),
    });
  }
  return { ok: true, meetings: out };
}
