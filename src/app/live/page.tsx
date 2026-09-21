import { corpus } from "@/lib/data/store";
import { HIGHLIGHT_CATEGORIES, PEOPLE } from "@/lib/seed/cast";
import { LiveRoom } from "@/components/live-room";

export default function LivePage() {
  const c = corpus();
  // The hour-long eight-person call is the one worth demonstrating live: it is
  // where a mid-call highlight actually earns its keep.
  const bundle = c.byMeeting.get("m-roadmap-lock")!;

  return (
    <LiveRoom
      meeting={bundle.meeting}
      segments={bundle.segments}
      chapters={bundle.chapters}
      people={PEOPLE.filter((p) =>
        bundle.meeting.participants.some((x) => x.personId === p.id),
      )}
      categories={HIGHLIGHT_CATEGORIES}
    />
  );
}
