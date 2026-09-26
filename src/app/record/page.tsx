import { RecordStudio, type AutoDecision } from "@/components/record-studio";
import { auth } from "@/auth";
import { upcomingMeetings } from "@/lib/google/calendar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Record a meeting — Noted" };

export default async function RecordPage({
  searchParams,
}: {
  searchParams: Promise<{ join?: string; title?: string; auto?: string }>;
}) {
  const sp = await searchParams;
  // Only real meeting links get opened from here. Anything else is ignored
  // rather than turned into an open redirect.
  const join = sp.join && /^https:\/\/(meet\.google\.com|[a-z0-9.]*zoom\.us|teams\.microsoft\.com)\//i.test(sp.join) ? sp.join : null;

  // Opened by the extension on join: look the call up in the calendar so the
  // page can say what the user's own rule decided, instead of asking again.
  let autoDecision: AutoDecision | null = null;
  if (sp.auto === "1" && join) {
    const session = await auth();
    if (!session?.user?.calendar || !session.user.id) {
      autoDecision = { kind: "no-calendar" };
    } else {
      const code = join.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i)?.[1]?.toLowerCase();
      const cal = await upcomingMeetings(session.user.id, 1);
      const hit = cal.ok && code ? cal.meetings.find((m) => m.joinUrl?.toLowerCase().includes(code)) : undefined;
      autoDecision = hit
        ? { kind: hit.defaultCapture === "off" ? "skip" : "record", reason: hit.reason, title: hit.title }
        : { kind: "not-on-calendar" };
    }
  }

  return (
    <RecordStudio
      configured={Boolean(process.env.ANTHROPIC_API_KEY)}
      transcription={Boolean(process.env.DEEPGRAM_API_KEY)}
      join={join}
      calendarTitle={sp.title?.slice(0, 140) ?? null}
      autoDecision={autoDecision}
    />
  );
}
