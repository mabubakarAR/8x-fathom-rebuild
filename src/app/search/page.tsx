import { corpus } from "@/lib/data/store";
import { PEOPLE } from "@/lib/seed/cast";
import { buildIndex, search } from "@/lib/search/engine";
import { SearchUI } from "@/components/search-ui";
import type { Index } from "@/lib/search/engine";

// The index is built once per process and reused across requests. Rebuilding
// it per keystroke would be the obvious way to make search feel slow.
let cachedIndex: Index | null = null;

function index(): Index {
  if (cachedIndex) return cachedIndex;
  const c = corpus();
  const summaryDocs = c.summaries.flatMap((s) =>
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
  cachedIndex = buildIndex(c.segments, summaryDocs);
  return cachedIndex;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; a?: string; who?: string; src?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const alpha = Math.max(0, Math.min(1, Number(sp.a ?? "0.35")));
  const who = sp.who || "";
  const src = (sp.src as "all" | "transcript" | "summary") || "all";

  const c = corpus();
  const meta = new Map(
    c.meetings.map((m) => [m.id, { title: m.title, startedAt: m.startedAt }]),
  );

  const hits = q
    ? search(index(), q, meta, {
        alpha,
        limit: 40,
        speakerIds: who ? new Set([who]) : undefined,
        source: src,
      })
    : [];

  const speakerIds = [...new Set(c.segments.map((s) => s.speakerId))];

  return (
    <SearchUI
      q={q}
      alpha={alpha}
      who={who}
      src={src}
      hits={hits}
      people={PEOPLE.filter((p) => speakerIds.includes(p.id))}
      corpusSize={{ meetings: c.meetings.length, segments: c.segments.length }}
    />
  );
}
