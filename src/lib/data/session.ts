import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { loadWorkspace, type Workspace } from "./workspace";

/**
 * The signed-in user's workspace, or a redirect to the front door.
 *
 * Every app page starts here. A signed-out visitor never sees a workspace
 * shaped page at all — not an empty one, not a demo one — because the
 * product has an owner now and a stranger is not them.
 */
export async function requireWorkspace(): Promise<{ uid: string; ws: Workspace; user: { name: string; email: string; image: string | null; calendar: boolean; guest: boolean } }> {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) redirect("/");
  const ws = await loadWorkspace(uid);
  return {
    uid,
    ws,
    user: {
      name: session.user.name ?? "",
      email: session.user.email ?? "",
      image: session.user.image ?? null,
      calendar: Boolean(session.user.calendar),
      guest: Boolean(session.user.guest),
    },
  };
}
