import { corpus } from "@/lib/data/store";
import { listLiveMeetings } from "@/lib/data/live";
import { listCalls } from "@/lib/db/calls";
import { PEOPLE, PERSON_BY_ID } from "@/lib/seed/cast";
import { UPCOMING } from "@/lib/seed/upcoming";
import { MeetingList, type MeetingRow } from "@/components/meeting-list";
import { HomeHero } from "@/components/home-hero";
import type { Lane } from "@/components/voice-print";
import { sliceMeeting, type ThumbSlice } from "@/lib/thumb";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const c = corpus();
  // Only calls still processing. Finished ones come back through
  // listCalls() below, with their waveform and counts — the two used to
  // overlap, which is why every recording appeared twice.
  const live = await listLiveMeetings();
  // Calls saved to the workspace. Newest first, above the demo corpus, and
  // absent entirely when no database is connected — the page still works.
  const saved = await listCalls(24);

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
      // Each segment carries its speaker's palette index so the thumbnail
      // can colour the waveform by who was actually talking.
      slices: sliceMeeting(
        bundle.segments.map((sg) => ({
          startMs: sg.startMs,
          endMs: sg.endMs,
          crosstalk: sg.crosstalk,
          hue: PERSON_BY_ID.get(sg.speakerId)?.hue,
        })),
        m.durationMs,
      ),
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

  // Calls mid-flight: uploaded or recorded, not yet analysed. They carry a
  // status so the row can say what is happening rather than look broken.
  const liveRows: MeetingRow[] = live.map((m) => ({
    id: m.id,
    title: m.title,
    kind: m.kind,
    platform: m.platform,
    startedAt: m.startedAt,
    durationMs: m.durationMs,
    gist: m.gist,
    hasExternal: m.hasExternal,
    lowConfidenceRatio: m.lowConfidenceRatio,
    slices: [] as ThumbSlice[],
    actionCount: 0,
    openActionCount: 0,
    highlightCount: 0,
    chapterCount: 0,
    isLive: true,
    status: m.status,
    participants: m.participants.map((p) => ({
      id: p.personId,
      name: p.personId,
      title: "",
      company: "",
      external: false,
      hue: 0,
      talkMs: p.talkMs,
      attended: p.attended,
    })),
  }));

  // The hero artwork is the hero meeting's own speaker lanes. Sent as a
  // compact array — eight lanes, start/end in seconds, a crosstalk flag —
  // because shipping 332 full Segment objects to draw 332 rectangles would be
  // silly.
  const heroBundle = c.byMeeting.get("m-roadmap-lock");
  const heroLaneOf = new Map(
    (heroBundle?.meeting.participants ?? [])
      .slice()
      .sort((a, b) => b.talkMs - a.talkMs)
      .map((p, i) => [p.personId, i] as const),
  );
  const lanes: Lane[] = (heroBundle?.segments ?? []).flatMap((seg) => {
    const l = heroLaneOf.get(seg.speakerId);
    if (l === undefined || l > 7) return [];
    return [{
      l,
      s: Math.round(seg.startMs / 100) / 10,
      e: Math.round(seg.endMs / 100) / 10,
      ...(seg.crosstalk ? { x: 1 as const } : {}),
    }];
  });

  const savedRows: MeetingRow[] = saved.map((c) => ({
    id: String(c.id),
    href: `/imported/${String(c.id)}`,
    title: String(c.title),
    kind: "planning",
    platform: c.origin === "call" ? "browser" : "upload",
    startedAt: new Date(c.started_at as string).toISOString(),
    durationMs: Number(c.duration_ms ?? 0),
    gist: String(c.gist ?? ""),
    hasExternal: false,
    lowConfidenceRatio: Number(c.low_confidence_ratio ?? 0),
    // Precomputed at save time, for the same reason: drawing this from
    // segments would mean loading every segment of every call.
    slices: (Array.isArray(c.shape) ? c.shape : []) as ThumbSlice[],
    actionCount: Number(c.action_count ?? 0),
    openActionCount: Number(c.action_count ?? 0),
    highlightCount: Number(c.highlight_count ?? 0),
    chapterCount: 0,
    isLive: true,
    participants: [],
  }));

  return (
    <MeetingList
      rows={[...savedRows, ...liveRows, ...rows]}
      upcoming={UPCOMING}
      people={PEOPLE}
      hero={<HomeHero configured={Boolean(process.env.ANTHROPIC_API_KEY)} lanes={lanes} />}
    />
  );
}
