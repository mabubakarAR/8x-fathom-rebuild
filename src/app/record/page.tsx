import { RecordStudio } from "@/components/record-studio";

export const dynamic = "force-dynamic";
export const metadata = { title: "Record a meeting — Fathom Rebuild" };

export default async function RecordPage({
  searchParams,
}: {
  searchParams: Promise<{ join?: string; title?: string }>;
}) {
  const sp = await searchParams;
  // Only real meeting links get opened from here. Anything else is ignored
  // rather than turned into an open redirect.
  const join = sp.join && /^https:\/\/(meet\.google\.com|[a-z0-9.]*zoom\.us|teams\.microsoft\.com)\//i.test(sp.join) ? sp.join : null;
  return (
    <RecordStudio
      configured={Boolean(process.env.ANTHROPIC_API_KEY)}
      transcription={Boolean(process.env.DEEPGRAM_API_KEY)}
      join={join}
      calendarTitle={sp.title?.slice(0, 140) ?? null}
    />
  );
}
