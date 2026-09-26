import { requireWorkspace } from "@/lib/data/session";
import { ActionsBoard } from "@/components/actions-board";

export const dynamic = "force-dynamic";

export default async function ActionsPage() {
  const { ws } = await requireWorkspace();
  const rows = ws.actionItems.map((a) => {
    const m = ws.byMeeting.get(a.meetingId)!.meeting;
    return { ...a, meetingTitle: m.title, meetingStartedAt: m.startedAt };
  });
  return <ActionsBoard rows={rows} people={ws.people} />;
}
