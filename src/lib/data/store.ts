import "server-only";

import { buildAll } from "@/lib/seed";
import { HIGHLIGHT_CATEGORIES, PEOPLE, TEMPLATES } from "@/lib/seed/cast";
import type {
  ActionItem,
  Chapter,
  Highlight,
  Meeting,
  Segment,
  Summary,
} from "@/lib/types";

// The whole corpus is deterministic and derived from the seed specs, so it is
// built once per process and cached. There is no database, and that is a
// deliberate call rather than a shortcut — see README "Why there is no
// database". Read paths are server-rendered from here; user mutations live in
// a client-side overlay so a stranger opening the live link gets a clean
// workspace rather than whatever the last visitor did to it.

export interface Corpus {
  meetings: Meeting[];
  segments: Segment[];
  chapters: Chapter[];
  summaries: Summary[];
  actionItems: ActionItem[];
  highlights: Highlight[];
  byMeeting: Map<
    string,
    {
      meeting: Meeting;
      segments: Segment[];
      chapters: Chapter[];
      summaries: Summary[];
      actionItems: ActionItem[];
      highlights: Highlight[];
    }
  >;
}

let cached: Corpus | null = null;

export function corpus(): Corpus {
  if (cached) return cached;

  const built = buildAll();
  const byMeeting = new Map<string, Corpus["byMeeting"] extends Map<string, infer V> ? V : never>();

  for (const b of built) {
    byMeeting.set(b.meeting.id, {
      meeting: b.meeting,
      segments: b.segments,
      chapters: b.chapters,
      summaries: b.summaries,
      actionItems: b.actionItems,
      highlights: b.highlights,
    });
  }

  cached = {
    meetings: built.map((b) => b.meeting),
    segments: built.flatMap((b) => b.segments),
    chapters: built.flatMap((b) => b.chapters),
    summaries: built.flatMap((b) => b.summaries),
    actionItems: built.flatMap((b) => b.actionItems),
    highlights: built.flatMap((b) => b.highlights),
    byMeeting,
  };
  return cached;
}

export function getMeeting(id: string) {
  return corpus().byMeeting.get(id) ?? null;
}

export function listMeetings(): Meeting[] {
  return corpus().meetings;
}

export { HIGHLIGHT_CATEGORIES, PEOPLE, TEMPLATES };
