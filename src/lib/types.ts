// Domain model for Sonar.
//
// Two deliberate divergences from Fathom's public API schema, both noted in
// PRODUCT-NOTES.md:
//
//  1. ONE timestamp convention. Fathom's API mixes "HH:MM:SS" strings (action
//     items, transcript) with float seconds (highlights). Everything here is
//     integer milliseconds from recording start. Formatting is a view concern.
//
//  2. Summaries are STRUCTURED, not an opaque markdown blob. Fathom ships
//     { template_name, markdown_formatted }, which is why the only way they can
//     cite a moment is to bury a hyperlink in prose. Here every bullet is a row
//     that carries its own anchor, so a citation is data and can be clicked,
//     hovered, counted and exported.

export type Ms = number;

export type Platform = "zoom" | "meet" | "teams";

export type MeetingKind =
  | "sales"
  | "discovery"
  | "customer"
  | "one-on-one"
  | "standup"
  | "planning"
  | "retro"
  | "interview"
  | "all-hands";

export interface Person {
  id: string;
  name: string;
  email: string;
  title: string;
  /** Internal to the workspace, or a guest from another company. */
  external: boolean;
  company: string;
  /** Index into the speaker palette. Stable per person so colours never shuffle. */
  hue: number;
}

export interface Participant {
  personId: string;
  /** Sum of segment durations for this speaker. Precomputed; drives the talk-time bar. */
  talkMs: Ms;
  /** Longest single uninterrupted stretch. The monologue metric. */
  longestMonologueMs: Ms;
  wordCount: number;
  questionsAsked: number;
  attended: boolean;
}

export interface Segment {
  id: string;
  meetingId: string;
  speakerId: string;
  startMs: Ms;
  endMs: Ms;
  text: string;
  /**
   * ASR confidence 0..1. Below CONFIDENCE_THRESHOLD the line renders with a
   * subtle underline and shows up in the "needs review" filter. This is the
   * hook for the speaker-repair flow — the whole point of the rebuild's answer
   * to crosstalk on big calls.
   */
  confidence: number;
  /** True when two people were talking at once. Drives the crosstalk markers. */
  crosstalk?: boolean;
}

export interface Chapter {
  id: string;
  meetingId: string;
  startMs: Ms;
  endMs: Ms;
  title: string;
  /** One line. What this stretch of the call was actually about. */
  gist: string;
}

export interface SummaryBullet {
  id: string;
  text: string;
  /** The moment this claim came from. Never null — an uncited bullet is a bug. */
  anchorMs: Ms;
  /** Who said it, when the bullet traces to one person. */
  speakerId?: string;
}

export interface SummarySection {
  id: string;
  heading: string;
  bullets: SummaryBullet[];
}

export interface Summary {
  id: string;
  meetingId: string;
  templateKey: TemplateKey;
  generatedAt: string;
  sections: SummarySection[];
}

export interface ActionItem {
  id: string;
  meetingId: string;
  text: string;
  assigneeId: string | null;
  /** Where in the call this was committed to. */
  anchorMs: Ms;
  done: boolean;
  /** False = extracted by the model. True = a human typed it. */
  userGenerated: boolean;
  dueHint?: string;
}

export interface HighlightCategory {
  key: string;
  label: string;
  /** Tailwind-safe token, resolved through the category colour map. */
  color: string;
}

export interface Highlight {
  id: string;
  meetingId: string;
  categoryKey: string;
  startMs: Ms;
  endMs: Ms;
  title: string;
  note?: string;
  createdById: string;
  createdAt: string;
}

export interface Meeting {
  id: string;
  title: string;
  kind: MeetingKind;
  platform: Platform;
  startedAt: string;
  durationMs: Ms;
  recordedById: string;
  participants: Participant[];
  /** One-line AI gist, shown on the list row. Fathom's web list has nothing like this. */
  gist: string;
  /** Internal-only or has outside guests. Drives the badge and the filters. */
  hasExternal: boolean;
  /** Fraction of segments below the confidence threshold. Surfaced on the hard case. */
  lowConfidenceRatio: number;
}

export type TemplateKey =
  | "general"
  | "sales"
  | "discovery"
  | "customer-success"
  | "one-on-one"
  | "project-update"
  | "retro"
  | "interview"
  | "qa";

export interface Template {
  key: TemplateKey;
  label: string;
  blurb: string;
  /** Section headings this template produces, in order. */
  sections: string[];
}

export interface AskCitation {
  meetingId: string;
  segmentId: string;
  anchorMs: Ms;
  snippet: string;
}

export interface AskMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  citations: AskCitation[];
  createdAt: string;
}

export interface AskThread {
  id: string;
  /** null = workspace-wide thread rather than scoped to one meeting. */
  meetingId: string | null;
  title: string;
  messages: AskMessage[];
  createdAt: string;
}

export interface ShareLink {
  token: string;
  meetingId: string;
  scope: "public" | "domain" | "invited";
  /** Present when the link points at a clip rather than the whole recording. */
  startMs?: Ms;
  endMs?: Ms;
  title?: string;
  createdAt: string;
  createdById: string;
}

export interface SearchHit {
  meetingId: string;
  meetingTitle: string;
  startedAt: string;
  segmentId: string;
  anchorMs: Ms;
  speakerId: string;
  /** The matched text with <mark> spans already applied. */
  html: string;
  plain: string;
  /** Lexical score, semantic score, and the blend actually used for ranking. */
  lexical: number;
  semantic: number;
  score: number;
  source: "transcript" | "summary";
}

export const CONFIDENCE_THRESHOLD = 0.82;
