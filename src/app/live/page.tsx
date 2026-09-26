import Link from "next/link";
import { HIGHLIGHT_CATEGORIES } from "@/lib/seed/cast";
import { requireWorkspace } from "@/lib/data/session";
import { LiveRoom } from "@/components/live-room";

export const dynamic = "force-dynamic";

// Replays the longest meeting in the workspace at 8× with a working mid-call
// highlight — the capture experience, reviewable without setting up a call.
export default async function LivePage() {
  const { ws } = await requireWorkspace();
  const longest = [...ws.meetings].sort((a, b) => b.durationMs - a.durationMs)[0];
  const bundle = longest ? ws.byMeeting.get(longest.id) : null;
  if (!bundle) {
    return (
      <div className="mx-auto w-full max-w-[720px] px-4 pt-16 text-center md:px-8">
        <h1 className="text-[19px] font-semibold">Nothing to replay yet</h1>
        <p className="mt-2 text-[13.5px]" style={{ color: "var(--ink-3)" }}>
          Record a meeting or import the sample workspace from <Link href="/" className="underline">home</Link>, then come back.
        </p>
      </div>
    );
  }
  return (
    <LiveRoom
      meeting={bundle.meeting}
      segments={bundle.segments}
      chapters={bundle.chapters}
      people={ws.people.filter((p) => bundle.meeting.participants.some((x) => x.personId === p.id))}
      categories={HIGHLIGHT_CATEGORIES}
    />
  );
}
