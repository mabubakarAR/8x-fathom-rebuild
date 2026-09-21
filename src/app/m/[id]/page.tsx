import { notFound } from "next/navigation";
import { corpus } from "@/lib/data/store";
import { getLiveMeeting } from "@/lib/data/live";
import { HIGHLIGHT_CATEGORIES, PEOPLE, SUGGESTED_TEMPLATES, TEMPLATES } from "@/lib/seed/cast";
import { MeetingView } from "@/components/meeting/view";

// Uploaded meetings are created at runtime, so this page cannot be fully
// static any more. Seeded ones still prerender.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return corpus().meetings.map((m) => ({ id: m.id }));
}

export default async function MeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // A real, uploaded meeting takes precedence; the seeded corpus is the
  // fallback. Both render through exactly the same component.
  const live = await getLiveMeeting(id);
  if (live) {
    if (live.status !== "ready") {
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
    return (
      <MeetingView
        meeting={live.meeting}
        segments={live.segments}
        chapters={live.chapters}
        summaries={live.summaries}
        actionItems={live.actionItems}
        highlights={live.highlights}
        people={live.people}
        rosterIds={live.people.map((p) => p.id)}
        categories={HIGHLIGHT_CATEGORIES}
        templates={TEMPLATES}
        suggested={live.summaries.map((s) => s.templateKey)}
        mediaUrl={live.mediaUrl}
        isLive
      />
    );
  }

  const bundle = corpus().byMeeting.get(id);
  if (!bundle) notFound();

  const rosterIds = new Set(bundle.meeting.participants.map((p) => p.personId));

  return (
    <MeetingView
      meeting={bundle.meeting}
      segments={bundle.segments}
      chapters={bundle.chapters}
      summaries={bundle.summaries}
      actionItems={bundle.actionItems}
      highlights={bundle.highlights}
      // The full cast is sent, not just attendees: speaker repair needs to be
      // able to reassign a line to someone the diarizer never identified.
      people={PEOPLE}
      rosterIds={[...rosterIds]}
      categories={HIGHLIGHT_CATEGORIES}
      templates={TEMPLATES}
      suggested={SUGGESTED_TEMPLATES[bundle.meeting.kind] ?? ["general"]}
    />
  );
}
