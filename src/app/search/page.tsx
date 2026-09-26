import { requireWorkspace } from "@/lib/data/session";
import { search } from "@/lib/search/engine";
import { workspaceIndex } from "@/lib/search/workspace-index";
import { SearchUI } from "@/components/search-ui";

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

  const { ws: c } = await requireWorkspace();
  const meta = new Map(
    c.meetings.map((m) => [m.id, { title: m.title, startedAt: m.startedAt }]),
  );

  const hits = q
    ? search(workspaceIndex(c), q, meta, {
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
      people={c.people.filter((p) => speakerIds.includes(p.id))}
      corpusSize={{ meetings: c.meetings.length, segments: c.segments.length }}
    />
  );
}
