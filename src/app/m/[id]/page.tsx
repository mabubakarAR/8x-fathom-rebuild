import { notFound } from "next/navigation";
import { requireWorkspace } from "@/lib/data/session";
import { getLiveMeeting } from "@/lib/data/live";
import { HIGHLIGHT_CATEGORIES, SUGGESTED_TEMPLATES, TEMPLATES } from "@/lib/seed/cast";
import { MeetingView } from "@/components/meeting/view";

export const dynamic = "force-dynamic";

// Every meeting page reads from the signed-in user's workspace. A meeting
// that is not theirs is a 404, not a permission error — the id space is not
// something to enumerate.

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ws } = await requireWorkspace();

  const bundle = ws.byMeeting.get(id);
  if (!bundle) {
    // Not in the ready set. It may still be processing, which deserves a
    // status page rather than a 404.
    const live = await getLiveMeeting(id);
    if (live && live.status !== "ready") {
      return (
        <div className="mx-auto w-full max-w-[760px] px-4 pt-16 text-center md:px-8">
          <h1 className="text-[19px] font-semibold">{live.meeting.title}</h1>
          <p className="mt-2 text-[13.5px]" style={{ color: "var(--ink-3)" }}>
            {live.status === "failed"
              ? `Processing failed: ${live.error ?? "unknown error"}`
              : `Still processing — ${live.status}. Refresh in a moment.`}
          </p>
        </div>
      );
    }
    notFound();
  }

  const m = bundle.meeting;
  const rosterIds = new Set(m.participants.map((p) => p.personId));
  const isSample = m.origin === "sample";

  return (
    <MeetingView
      meeting={m}
      segments={bundle.segments}
      chapters={bundle.chapters}
      summaries={bundle.summaries}
      actionItems={bundle.actionItems}
      highlights={bundle.highlights}
      // The whole workspace's people, not just attendees: speaker repair
      // needs to be able to reassign a line to someone the diarizer never
      // identified but who is known from another meeting.
      people={ws.people}
      rosterIds={[...rosterIds]}
      categories={HIGHLIGHT_CATEGORIES}
      templates={TEMPLATES}
      suggested={isSample ? (SUGGESTED_TEMPLATES[m.kind] ?? ["general"]) : bundle.summaries.map((s) => s.templateKey)}
      mediaUrl={m.mediaUrl ?? null}
      isLive={!isSample}
    />
  );
}
