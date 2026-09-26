import { auth } from "@/auth";
import { loadWorkspace } from "@/lib/data/workspace";
import { upcomingMeetings, type UpcomingMeeting } from "@/lib/google/calendar";
import { listProcessing } from "@/lib/db/calls";
import { MeetingList, type MeetingRow } from "@/components/meeting-list";
import { WorkspaceHero } from "@/components/workspace-hero";
import { Landing } from "@/components/landing";
import { ConnectCalendarButton, SignInButton } from "@/components/sign-in-button";
import type { ThumbSlice } from "@/lib/thumb";
import { sliceMeeting } from "@/lib/thumb";

export const dynamic = "force-dynamic";

// The front door and the home page are the same route, because what you see
// depends only on whether you are signed in. A stranger gets the landing
// page; a user gets their workspace. There is no third state.

export default async function HomePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) {
    const { next } = await searchParams;
    return <Landing next={safeNext(next)} />;
  }

  const [ws, cal, processing] = await Promise.all([
    loadWorkspace(uid),
    session.user.calendar
      ? upcomingMeetings(uid).catch((e) => ({ ok: false as const, reason: e instanceof Error ? e.message : "Calendar failed" }))
      : Promise.resolve({ ok: false as const, reason: "Calendar not connected" }),
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

  // A guest has no Google account behind the session, so "connect calendar"
  // would really be "sign in with Google as someone else". Say that instead.
  const connect = session.user.guest ? (
    <GuestCalendarNote />
  ) : (
    <ConnectCalendarButton
      className="rounded-full px-4 py-[9px] text-[13px] font-semibold"
      style={{ background: "var(--accent)", color: "var(--on-accent)" }}
    />
  );

  return (
    <MeetingList
      rows={[...processingRows, ...rows]}
      upcoming={upcoming}
      calendarError={cal.ok ? null : cal.reason}
      calendarConnected={Boolean(session.user.calendar)}
      connectCalendar={connect}
      people={ws.people}
      me={me}
      hasSample={ws.hasSample}
      hero={
        <WorkspaceHero
          name={session.user.name ?? ""}
          empty={ws.meetings.length === 0 && processing.length === 0}
          meetings={ws.meetings.length}
          minutes={Math.round(ws.meetings.reduce((a, m) => a + m.durationMs, 0) / 60000)}
          openActions={ws.actionItems.filter((a) => !a.done).length}
          next={upcoming.find((u) => u.joinUrl) ?? upcoming[0] ?? null}
          calendarConnected={Boolean(session.user.calendar)}
          connectCalendar={connect}
        />
      }
    />
  );
}

function GuestCalendarNote() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-[12.5px]" style={{ color: "var(--ink-3)" }}>Guest workspaces have no Google account to read a calendar from.</span>
      <SignInButton
        label="Sign in with Google instead"
        className="rounded-full px-3.5 py-[7px] text-[12.5px] font-semibold"
        style={{ background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--line-strong)" }}
      />
    </div>
  );
}

/** Only a same-origin path is ever used as a post-sign-in destination. */
function safeNext(v?: string): string | undefined {
  if (!v || !v.startsWith("/") || v.startsWith("//")) return undefined;
  return v;
}
