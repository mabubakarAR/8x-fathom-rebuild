import { notFound } from "next/navigation";
import { corpus } from "@/lib/data/store";
import { HIGHLIGHT_CATEGORIES, PEOPLE, SUGGESTED_TEMPLATES, TEMPLATES } from "@/lib/seed/cast";
import { MeetingView } from "@/components/meeting/view";

export function generateStaticParams() {
  return corpus().meetings.map((m) => ({ id: m.id }));
}

export default async function MeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
