"use client";

import type { EvidenceLedger } from "@/lib/evidence";
import type { RawSegment } from "@/lib/pipeline/transcribe";
import type {
  ActionItem,
  Chapter,
  Highlight,
  Meeting,
  Person,
  Segment,
  Summary,
} from "@/lib/types";

// Imported meetings.
//
// A transcript you bring, analysed for real by Claude, kept in your browser.
// No database — which is a real limitation and is stated in the UI — but the
// content is genuinely model-generated over genuinely user-supplied words,
// which is the thing that was missing.
//
// Everything here converts the API response into exactly the shapes the
// existing meeting components already render, so an imported meeting and a
// seeded one go through identical code.

const KEY = "8x-fathom-rebuild.imported.v1";

export interface ImportedAnalysis {
  title: string;
  gist: string;
  speakerNames: Record<string, string>;
  chapters: { title: string; gist: string; startIdx: number }[];
  sections: { heading: string; bullets: { text: string; segmentIdx: number }[] }[];
  actions: { text: string; speakerLabel: number | null; segmentIdx: number; dueHint?: string }[];
  highlights: { title: string; categoryKey: string; startIdx: number; endIdx: number; note?: string }[];
  model: string;
  /** Absent on imports saved by an older build. */
  evidence?: EvidenceLedger;
}

export interface ImportedMeeting {
  id: string;
  createdAt: string;
  templateKey: string;
  format: string;
  warnings: string[];
  segments: RawSegment[];
  speakerNames: Record<string, string>;
  analysis: ImportedAnalysis;
  /** Summaries generated later, by picking a template that had not been run.
   *  Keyed by template. Each is a real model call over the same transcript. */
  extraSections?: Record<
    string,
    { heading: string; bullets: { text: string; segmentIdx: number }[] }[]
  >;
}

function readAll(): ImportedMeeting[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ImportedMeeting[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: ImportedMeeting[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* quota or private mode — the current session still works in memory */
  }
}

export function listImported(): ImportedMeeting[] {
  return readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getImported(id: string): ImportedMeeting | null {
  return readAll().find((m) => m.id === id) ?? null;
}

export function saveImported(m: ImportedMeeting) {
  const all = readAll().filter((x) => x.id !== m.id);
  // Keep the last 10; a transcript is large and localStorage is not.
  writeAll([m, ...all].slice(0, 10));
}

export function deleteImported(id: string) {
  writeAll(readAll().filter((m) => m.id !== id));
}

// ---------------------------------------------------------------------------
// Conversion into the shapes the UI speaks
// ---------------------------------------------------------------------------

export interface ImportedBundle {
  meeting: Meeting;
  segments: Segment[];
  chapters: Chapter[];
  summaries: Summary[];
  actionItems: ActionItem[];
  highlights: Highlight[];
  people: Person[];
}

export function toBundle(m: ImportedMeeting): ImportedBundle {
  const id = m.id;
  // The file wins.
  //
  // If the transcript literally says <v Helen>, that is a fact and the model
  // does not get to overwrite it — and it will, because the prompt tells it
  // to answer "Speaker N" when it cannot tell, and "Speaker 1" is a perfectly
  // truthy string that silently beat the real name here. The model only fills
  // labels the file left anonymous.
  //
  // The same rule already lives in /api/analyse; this is the second copy,
  // which is exactly how it drifted. Both now read the same way.
  const fromFile = (label: number) => m.speakerNames?.[String(label)];
  const fromModel = (label: number) => {
    const v = m.analysis.speakerNames?.[String(label)];
    // A model answer that is just "Speaker 3" carries no information, so it
    // should not outrank the fallback either.
    return v && !/^speaker\s*\d+$/i.test(v.trim()) ? v : undefined;
  };
  const nameOf = (label: number) =>
    fromFile(label) || fromModel(label) || `Speaker ${label + 1}`;

  const labels = [...new Set(m.segments.map((s) => s.speakerLabel))].sort((a, b) => a - b);
  const spId = (label: number) => `${id}-sp${label}`;
  const segId = (i: number) => `${id}-s${i}`;

  const people: Person[] = labels.map((label) => ({
    id: spId(label),
    name: nameOf(label),
    email: "",
    title: "",
    external: false,
    company: "",
    hue: label % 15,
  }));

  const segments: Segment[] = m.segments.map((s, i) => ({
    id: segId(i),
    meetingId: id,
    speakerId: spId(s.speakerLabel),
    startMs: s.startMs,
    endMs: s.endMs,
    text: s.text,
    confidence: s.confidence,
    crosstalk: i > 0 && s.startMs < m.segments[i - 1].endMs - 120 ? true : undefined,
  }));

  const durationMs = segments.length ? segments[segments.length - 1].endMs : 0;

  const talk = new Map<number, number>();
  const words = new Map<number, number>();
  for (const s of m.segments) {
    talk.set(s.speakerLabel, (talk.get(s.speakerLabel) ?? 0) + (s.endMs - s.startMs));
    words.set(
      s.speakerLabel,
      (words.get(s.speakerLabel) ?? 0) + s.text.split(/\s+/).filter(Boolean).length,
    );
  }

  const chapters: Chapter[] = m.analysis.chapters.map((c, i) => {
    const startSeg = m.segments[c.startIdx];
    const nextIdx = m.analysis.chapters[i + 1]?.startIdx ?? m.segments.length;
    const endSeg = m.segments[Math.max(c.startIdx, nextIdx - 1)];
    return {
      id: `${id}-c${i}`,
      meetingId: id,
      startMs: startSeg?.startMs ?? 0,
      endMs: endSeg?.endMs ?? durationMs,
      title: c.title,
      gist: c.gist,
    };
  });

  const buildSections = (
    src: { heading: string; bullets: { text: string; segmentIdx: number }[] }[],
    prefix: string,
  ) =>
    src.map((sec, i) => ({
      id: `${id}-${prefix}${i}`,
      heading: sec.heading,
      bullets: sec.bullets
        // A bullet whose index is not a real segment is dropped rather than
        // rendered as a citation that goes nowhere.
        .filter((b) => m.segments[b.segmentIdx])
        .map((b, j) => ({
          id: `${id}-${prefix}${i}-b${j}`,
          text: b.text,
          anchorMs: m.segments[b.segmentIdx].startMs,
          speakerId: spId(m.segments[b.segmentIdx].speakerLabel),
        })),
    }));

  const summaries: Summary[] = [
    {
      id: `${id}-sum`,
      meetingId: id,
      templateKey: m.templateKey as Summary["templateKey"],
      generatedAt: m.createdAt,
      sections: m.analysis.sections.map((sec, i) => ({
        id: `${id}-sec${i}`,
        heading: sec.heading,
        bullets: sec.bullets
          // A bullet whose index is not a real segment is dropped rather than
          // rendered as a citation that goes nowhere.
          .filter((b) => m.segments[b.segmentIdx])
          .map((b, j) => ({
            id: `${id}-sec${i}-b${j}`,
            text: b.text,
            anchorMs: m.segments[b.segmentIdx].startMs,
            speakerId: spId(m.segments[b.segmentIdx].speakerLabel),
          })),
      })),
    },
    ...Object.entries(m.extraSections ?? {}).map(([key, secs]) => ({
      id: `${id}-sum-${key}`,
      meetingId: id,
      templateKey: key as Summary["templateKey"],
      generatedAt: m.createdAt,
      sections: buildSections(secs, `x${key}-`),
    })),
  ];

  const actionItems: ActionItem[] = m.analysis.actions
    .filter((a) => m.segments[a.segmentIdx])
    .map((a, i) => ({
      id: `${id}-a${i}`,
      meetingId: id,
      text: a.text,
      assigneeId:
        a.speakerLabel !== null && labels.includes(a.speakerLabel) ? spId(a.speakerLabel) : null,
      anchorMs: m.segments[a.segmentIdx].startMs,
      done: false,
      userGenerated: false,
      dueHint: a.dueHint,
    }));

  const highlights: Highlight[] = m.analysis.highlights
    .filter((h) => m.segments[h.startIdx])
    .map((h, i) => ({
      id: `${id}-h${i}`,
      meetingId: id,
      categoryKey: h.categoryKey,
      startMs: m.segments[h.startIdx].startMs,
      endMs: (m.segments[h.endIdx] ?? m.segments[h.startIdx]).endMs,
      title: h.title,
      note: h.note,
      createdById: people[0]?.id ?? "",
      createdAt: m.createdAt,
    }));

  const lowConf = m.segments.filter((s) => s.confidence < 0.82).length;

  const meeting: Meeting = {
    id,
    title: m.analysis.title,
    kind: "planning",
    platform: "zoom",
    startedAt: m.createdAt,
    durationMs,
    gist: m.analysis.gist,
    hasExternal: false,
    lowConfidenceRatio: m.segments.length ? lowConf / m.segments.length : 0,
    recordedById: people[0]?.id ?? "",
    participants: labels.map((label) => ({
      personId: spId(label),
      talkMs: talk.get(label) ?? 0,
      longestMonologueMs: 0,
      wordCount: words.get(label) ?? 0,
      questionsAsked: m.segments.filter(
        (s) => s.speakerLabel === label && s.text.includes("?"),
      ).length,
      attended: true,
    })),
  };

  return { meeting, segments, chapters, summaries, actionItems, highlights, people };
}
