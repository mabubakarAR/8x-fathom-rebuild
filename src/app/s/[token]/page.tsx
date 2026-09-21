import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { corpus } from "@/lib/data/store";
import { PEOPLE } from "@/lib/seed/cast";
import { decodeShare } from "@/lib/sharelink";
import { ShareView } from "@/components/share-view";

// The public, signed-out surface. Rendered outside the app shell — a stranger
// opening a clip link should see the clip, not somebody else's workspace
// navigation.

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const payload = decodeShare(token);
  const bundle = payload ? corpus().byMeeting.get(payload.m) : null;
  if (!bundle) return { title: "Link not found — Sonar" };
  const title = payload?.t ? `${payload.t} — clip` : bundle.meeting.title;
  return {
    title: `${title} — Sonar`,
    description: bundle.meeting.gist,
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const payload = decodeShare(token);
  if (!payload) notFound();

  const bundle = corpus().byMeeting.get(payload.m);
  if (!bundle) notFound();

  const isClip = payload.s != null && payload.e != null;
  const startMs = isClip ? payload.s! : 0;
  const endMs = isClip ? payload.e! : bundle.meeting.durationMs;

  // A clip link ships ONLY the clip's segments. The rest of the call is not
  // sent to the client at all — "share a moment" should not quietly hand over
  // the whole hour.
  const segments = isClip
    ? bundle.segments.filter((s) => s.endMs > startMs && s.startMs < endMs)
    : bundle.segments;

  const rosterIds = new Set(segments.map((s) => s.speakerId));

  return (
    <ShareView
      meeting={bundle.meeting}
      segments={segments}
      chapters={isClip ? [] : bundle.chapters}
      summary={isClip ? null : (bundle.summaries[0] ?? null)}
      actionItems={isClip ? [] : bundle.actionItems}
      people={PEOPLE.filter((p) => rosterIds.has(p.id) || !isClip)}
      startMs={startMs}
      endMs={endMs}
      isClip={isClip}
      clipTitle={payload.t ?? null}
      sharedBy={payload.by ?? null}
      scope={payload.sc}
    />
  );
}
