import { corpus } from "@/lib/data/store";
import { PERSON_BY_ID } from "@/lib/seed/cast";
import { MeetingList, type MeetingRow } from "@/components/meeting-list";

export default function HomePage() {
  const c = corpus();

  const rows: MeetingRow[] = c.meetings.map((m) => {
    const bundle = c.byMeeting.get(m.id)!;
    const people = m.participants
      .map((p) => ({ p, person: PERSON_BY_ID.get(p.personId)! }))
      .filter((x) => x.person)
      .sort((a, b) => b.p.talkMs - a.p.talkMs);

    return {
      id: m.id,
      title: m.title,
      kind: m.kind,
      platform: m.platform,
      startedAt: m.startedAt,
      durationMs: m.durationMs,
      gist: m.gist,
      hasExternal: m.hasExternal,
      lowConfidenceRatio: m.lowConfidenceRatio,
      actionCount: bundle.actionItems.length,
      openActionCount: bundle.actionItems.filter((a) => !a.done).length,
      highlightCount: bundle.highlights.length,
      chapterCount: bundle.chapters.length,
      participants: people.map(({ p, person }) => ({
        id: person.id,
        name: person.name,
        title: person.title,
        company: person.company,
        external: person.external,
        hue: person.hue,
        talkMs: p.talkMs,
        attended: p.attended,
      })),
    };
  });

  return <MeetingList rows={rows} />;
}
