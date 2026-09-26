import "server-only";
import { db } from "@/lib/db/client";

export interface UserSettings {
  autoRecord: "all" | "external" | "none";
  defaultTemplate: string;
  autoShare: boolean;
  calendarConnected: boolean;
  createdAt: string;
  meetings: number;
  recordings: number;
}

export async function loadSettings(uid: string): Promise<UserSettings | null> {
  const sql = db();
  if (!sql) return null;
  const rows = await sql<{ auto_record: string; default_template: string; auto_share: boolean; calendar_connected: boolean; created_at: Date; meetings: number; recordings: number }[]>`
    select u.auto_record, u.default_template, u.auto_share, u.calendar_connected, u.created_at,
           (select count(*)::int from meetings m where m.owner_id = u.id) as meetings,
           (select count(*)::int from meetings m where m.owner_id = u.id and m.sample = false) as recordings
    from users u where u.id = ${uid}`;
  const r = rows[0];
  if (!r) return null;
  return {
    autoRecord: (r.auto_record as UserSettings["autoRecord"]) ?? "all",
    defaultTemplate: r.default_template ?? "general",
    autoShare: Boolean(r.auto_share),
    calendarConnected: Boolean(r.calendar_connected),
    createdAt: new Date(r.created_at).toISOString(),
    meetings: r.meetings,
    recordings: r.recordings,
  };
}

export async function saveSettings(uid: string, patch: Partial<Pick<UserSettings, "autoRecord" | "defaultTemplate" | "autoShare">>): Promise<boolean> {
  const sql = db();
  if (!sql) return false;
  if (patch.autoRecord !== undefined) {
    if (!["all", "external", "none"].includes(patch.autoRecord)) return false;
    await sql`update users set auto_record = ${patch.autoRecord} where id = ${uid}`;
  }
  if (patch.defaultTemplate !== undefined) {
    await sql`update users set default_template = ${String(patch.defaultTemplate).slice(0, 40)} where id = ${uid}`;
  }
  if (patch.autoShare !== undefined) {
    await sql`update users set auto_share = ${Boolean(patch.autoShare)} where id = ${uid}`;
  }
  return true;
}

/** Forget the calendar: drop the refresh token. Google-side revocation is the user's, at myaccount.google.com. */
export async function disconnectCalendar(uid: string): Promise<void> {
  const sql = db();
  if (!sql) return;
  await sql`update users set google_refresh_token = null, calendar_connected = false where id = ${uid}`;
}

/** Everything. Meetings cascade to every child table. The user row stays so sign-in still works. */
export async function deleteAllData(uid: string): Promise<number> {
  const sql = db();
  if (!sql) return 0;
  const rows = await sql`delete from meetings where owner_id = ${uid} returning id`;
  return rows.length;
}
