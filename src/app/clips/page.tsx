import Link from "next/link";
import { corpus, HIGHLIGHT_CATEGORIES } from "@/lib/data/store";
import { PERSON_BY_ID } from "@/lib/seed/cast";
import { clock } from "@/lib/format";
import { encodeShare } from "@/lib/sharelink";
import { PageHeader } from "@/components/page-header";
import { Avatar, Icon } from "@/components/ui";
import { mapTone } from "@/lib/tone";
import { CopyLink } from "@/components/copy-link";

export default function ClipsPage() {
  const c = corpus();
  const byKey = new Map(HIGHLIGHT_CATEGORIES.map((x) => [x.key, x]));

  const clips = [...c.highlights]
    .map((h) => ({ h, meeting: c.byMeeting.get(h.meetingId)!.meeting }))
    .sort(
      (a, b) =>
        new Date(b.meeting.startedAt).getTime() - new Date(a.meeting.startedAt).getTime() ||
        a.h.startMs - b.h.startMs,
    );

  const byCategory = new Map<string, typeof clips>();
  for (const item of clips) {
    byCategory.set(item.h.categoryKey, [...(byCategory.get(item.h.categoryKey) ?? []), item]);
  }

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 pb-24 md:px-8">
      <PageHeader
        title="Clips"
        subtitle={`${clips.length} moments pulled out of ${new Set(clips.map((x) => x.h.meetingId)).size} meetings. Each one has its own link that works for someone with no account.`}
      />

      <div className="flex flex-col gap-6">
        {[...byCategory.entries()].map(([key, items]) => {
          const cat = byKey.get(key);
          const tone = mapTone(cat?.color ?? "sky");
          return (
            <section key={key}>
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="rounded-full px-2.5 py-[3px] text-[11.5px] font-semibold"
                  style={{ background: `var(--${tone}-soft)`, color: `var(--${tone})` }}
                >
                  {cat?.label ?? key}
                </span>
                <span className="text-[12px] tnum" style={{ color: "var(--ink-faint)" }}>
                  {items.length}
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {items.map(({ h, meeting }) => {
                  const author = PERSON_BY_ID.get(h.createdById);
                  const token = encodeShare({
                    m: h.meetingId,
                    s: h.startMs,
                    e: h.endMs,
                    t: h.title,
                    sc: "public",
                    by: author?.name,
                  });
                  return (
                    <div
                      key={h.id}
                      className="flex flex-col rounded-[var(--radius-lg)] p-3"
                      style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
                    >
                      <Link
                        href={`/m/${h.meetingId}?t=${Math.round(h.startMs)}`}
                        className="text-[13.5px] leading-snug font-semibold hover:underline"
                        style={{ color: "var(--ink)" }}
                      >
                        {h.title}
                      </Link>

                      {h.note && (
                        <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: "var(--ink-3)" }}>
                          {h.note}
                        </p>
                      )}

                      <div
                        className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px]"
                        style={{ color: "var(--ink-faint)" }}
                      >
                        <span className="tnum">
                          {clock(h.startMs)} · {Math.round((h.endMs - h.startMs) / 1000)}s
                        </span>
                        <span aria-hidden>·</span>
                        <Link href={`/m/${h.meetingId}`} className="truncate hover:underline">
                          {meeting.title}
                        </Link>
                      </div>

                      <div className="mt-2.5 flex items-center gap-2 pt-2" style={{ borderTop: "1px solid var(--line)" }}>
                        {author && (
                          <span className="flex items-center gap-1.5 text-[11.5px]" style={{ color: "var(--ink-faint)" }}>
                            <Avatar person={author} size={16} />
                            {author.name.split(" ")[0]}
                          </span>
                        )}
                        <span className="ml-auto flex items-center gap-1.5">
                          <Link
                            href={`/s/${token}`}
                            className="flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-[4px] text-[11.5px] font-medium"
                            style={{ background: "var(--surface-2)", color: "var(--ink-2)" }}
                          >
                            <Icon name="external" size={12} /> Open
                          </Link>
                          <CopyLink path={`/s/${token}`} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <p className="mt-8 text-center text-[12px]" style={{ color: "var(--ink-faint)" }}>
        Every clip link opens without signing in — try one in a private window.{" "}
        <Link href="/about" className="underline" style={{ color: "var(--accent-ink)" }}>
          How sharing works
        </Link>
      </p>
    </div>
  );
}
