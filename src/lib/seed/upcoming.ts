import type { Platform } from "@/lib/types";

// ---------------------------------------------------------------------------
// The calendar side.
//
// "Connect a calendar" is the first item on the brief's list and it was the
// one thing on that list with no surface here at all. Fathom's entire
// onboarding is calendar-gated — connect Google or Microsoft, and from then on
// the product decides what to record based on what is on your calendar. A
// notetaker with no calendar is a recording list, not a notetaker.
//
// The connection itself is simulated (no OAuth, no Google API). What is real
// is the part that matters for the product: a per-meeting capture decision
// made BEFORE the meeting, which is the control Fathom's own 3.0 desktop app
// added and the thing that stops the bot turning up where it isn't wanted —
// one of the more pointed complaints in their review corpus.
// ---------------------------------------------------------------------------

export type CaptureMode = "off" | "transcript" | "audio" | "full";

export const CAPTURE_MODES: { key: CaptureMode; label: string; hint: string }[] = [
  { key: "off", label: "Don't record", hint: "Nothing joins. Nothing is stored." },
  { key: "transcript", label: "Transcript only", hint: "Text, no audio kept." },
  { key: "audio", label: "Audio", hint: "Audio and transcript." },
  { key: "full", label: "Audio + video", hint: "Everything, clips included." },
];

export interface UpcomingMeeting {
  id: string;
  title: string;
  /** Minutes from "now" when the session loads, so the list never goes stale. */
  startsInMinutes: number;
  durationMin: number;
  platform: Platform;
  attendeeIds: string[];
  /** Guests with no account, shown by email only — as a calendar invite would. */
  guestEmails?: string[];
  /** What the calendar rule chose by default, before the user overrides it. */
  defaultCapture: CaptureMode;
  /** Why it chose that — shown inline, because an invisible rule is a footgun. */
  reason: string;
  recurring?: boolean;
}

// Ordered soonest first.
export const UPCOMING: UpcomingMeeting[] = [
  {
    id: "u-brightwater-checkin",
    title: "Brightwater Health — renewal check-in",
    startsInMinutes: 24,
    durationMin: 30,
    platform: "teams",
    attendeeIds: ["p-rachel", "p-leah", "p-jonas"],
    guestEmails: ["helen.gao@brightwaterhealth.com", "owen.f@brightwaterhealth.com"],
    defaultCapture: "full",
    reason: "External guests on the invite",
  },
  {
    id: "u-standup",
    title: "Platform standup",
    startsInMinutes: 96,
    durationMin: 15,
    platform: "meet",
    attendeeIds: ["p-marcus", "p-abubakar", "p-ayesha", "p-dani", "p-tom"],
    defaultCapture: "transcript",
    reason: "Recurring internal — transcript is enough",
    recurring: true,
  },
  {
    id: "u-1on1",
    title: "Priya / Abubakar — weekly 1:1",
    startsInMinutes: 190,
    durationMin: 30,
    platform: "meet",
    attendeeIds: ["p-priya", "p-abubakar"],
    defaultCapture: "audio",
    reason: "Two-person internal",
    recurring: true,
  },
  {
    id: "u-comp-review",
    title: "Compensation review — do not record",
    startsInMinutes: 300,
    durationMin: 45,
    platform: "zoom",
    attendeeIds: ["p-rachel", "p-priya"],
    defaultCapture: "off",
    reason: "Title matches a do-not-record rule",
  },
  {
    id: "u-kestrel-legal",
    title: "Kestrel Freight — legal terms walkthrough",
    startsInMinutes: 1_290,
    durationMin: 60,
    platform: "zoom",
    attendeeIds: ["p-leah", "p-rachel"],
    guestEmails: ["dsalas@kestrelfreight.com", "legal@kestrelfreight.com"],
    defaultCapture: "full",
    reason: "External guests on the invite",
  },
  {
    id: "u-nina-final",
    title: "Nina Petrova — final round",
    startsInMinutes: 1_620,
    durationMin: 45,
    platform: "meet",
    attendeeIds: ["p-priya", "p-marcus"],
    guestEmails: ["nina.petrova@hey.com"],
    defaultCapture: "audio",
    reason: "Candidate interview — video off by policy",
  },
];
