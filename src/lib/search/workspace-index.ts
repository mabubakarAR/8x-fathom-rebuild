import "server-only";
import { buildIndex, type Index } from "./engine";
import type { Workspace } from "@/lib/data/workspace";

// One search index per workspace, rebuilt only when the set of meetings
// changes. Search, Ask-the-workspace and the commitment tracker all share it.

const cache = new Map<string, { key: string; index: Index }>();

function versionKey(ws: Workspace): string {
  return ws.meetings.map((m) => m.id).join("|") + "#" + ws.segments.length;
}

export function workspaceIndex(ws: Workspace): Index {
  const key = versionKey(ws);
  const hit = cache.get(ws.ownerId);
  if (hit && hit.key === key) return hit.index;
  const summaryDocs = ws.summaries.flatMap((s) =>
    s.sections.flatMap((sec) =>
      sec.bullets.map((b) => ({
        segmentId: b.id,
        meetingId: s.meetingId,
        anchorMs: b.anchorMs,
        text: b.text,
        speakerId: b.speakerId ?? "",
      })),
    ),
  );
  const index = buildIndex(ws.segments, summaryDocs);
  cache.set(ws.ownerId, { key, index });
  return index;
}
