import { corpus } from "@/lib/data/store";
import { PEOPLE } from "@/lib/seed/cast";
import { ActionsBoard } from "@/components/actions-board";

export default function ActionsPage() {
  const c = corpus();
  const rows = c.actionItems.map((a) => {
    const m = c.byMeeting.get(a.meetingId)!.meeting;
    return {
      ...a,
      meetingTitle: m.title,
      meetingStartedAt: m.startedAt,
    };
  });
  return <ActionsBoard rows={rows} people={PEOPLE} />;
}
