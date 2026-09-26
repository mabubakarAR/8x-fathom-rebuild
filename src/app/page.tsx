import { auth } from "@/auth";
import { loadWorkspace } from "@/lib/data/workspace";
import { upcomingMeetings, type UpcomingMeeting } from "@/lib/google/calendar";
import { listProcessing } from "@/lib/db/calls";
import { MeetingList, type MeetingRow } from "@/components/meeting-list";
import { WorkspaceHero } from "@/components/workspace-hero";
import { Landing } from "@/components/landing";
import type { ThumbSlice } from "@/lib/thumb";
import { sliceMeeting } from "@/lib/thumb";

export const dynamic = "force-dynamic";

// The front door and the home page are the same route, because what you see
// depends only on whether you are signed in. A stranger gets the landing
// page; a user gets their workspace. There is no third state.

export default async function HomePage() {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return <Landing />;

  const [ws, cal, processing] = await Promise.all([
    loadWorkspace(uid),
    upcomingMeetings(uid).catch((e) => ({ ok: false as const, reason: e instanceof Error ? e.message : "Calendar failed" })),
    listProcessing(uid),
  ]);

  const rows: MeetingRow[] = ws.meetings.map((m) => {
    const bundle = ws.byMeeting.get(m.id)!;
    const people = m.participants
      .map((p) => ({ p, person: ws.personById.get(p.personId) }))
      .filter((x): x is { p: typeof x.p; person: NonNullable<typeof x.person> } => Boolean(x.person))
      .sort((a, b) => b.p.talkMs - a.p.talkMs);
    return {
      id: m.id,
      href: m.origin === "sample" ? `/m/${m.id}` : `/m/${m.id}`,
      title: m.title,
      kind: m.kind,
      platform: m.platform,
      startedAt: m.startedAt,
      durationMs: m.durationMs,
      gist: m.gist,
      hasExternal: m.hasExternal,
      lowConfidenceRatio: m.lowConfidenceRatio,
      slices: sliceMeeting(
        bundle.segments.map((sg) => ({ startMs: sg.startMs, endMs: sg.endMs, crosstalk: sg.crosstalk, hue: ws.personById.get(sg.speakerId)?.hue })),
        m.durationMs,
      ),
      actionCount: bundle.actionItems.length,
      openActionCount: bundle.actionItems.filter((a) => !a.done).length,
      highlightCount: bundle.highlights.length,
      chapterCount: bundle.chapters.length,
      isLive: m.origin !== "sample",
      participants: people.map(({ p, person }) => ({
        id: person.id, name: person.name, title: person.title, company: person.company,
        external: person.external, hue: person.hue, talkMs: p.talkMs, attended: p.attended,
      })),
    };
  });

  const processingRows: MeetingRow[] = processing.map((c) => ({
    id: c.id,
    title: c.title,
    kind: "planning",
    platform: c.origin === "call" ? "browser" : "upload",
    startedAt: c.startedAt,
    durationMs: c.durationMs,
    gist: `Processing — ${c.status}…`,
    hasExternal: false,
    lowConfidenceRatio: 0,
    slices: [] as ThumbSlice[],
    actionCount: 0, openActionCount: 0, highlightCount: 0, chapterCount: 0,
    isLive: true,
    status: c.status,
    participants: [],
  }));

  const upcoming: UpcomingMeeting[] = cal.ok ? cal.meetings : [];
  const me = ws.people.find((p) => p.email && p.email === session.user.email)?.id ?? "";

  return (
    <MeetingList
      rows={[...processingRows, ...rows]}
      upcoming={upcoming}
      calendarError={cal.ok ? null : cal.reason}
      calendarConnected={Boolean(session.user.calendar)}
      people={ws.people}
      me={me}
      hasSample={ws.hasSample}
      hero={<WorkspaceHero empty={ws.meetings.length === 0 && processing.length === 0} name={session.user.name ?? ""} />}
    />
  );
}
