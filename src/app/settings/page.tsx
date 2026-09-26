import { requireWorkspace } from "@/lib/data/session";
import { loadSettings } from "@/lib/db/settings";
import { TEMPLATES } from "@/lib/seed/cast";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/settings-form";
import { ConnectCalendarButton, SignOutButton } from "@/components/sign-in-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings — Verbatim" };

// Settings, as a sentence and a few switches.
//
// Fathom's settings page is two screens of integration cards. The decisions a
// notetaker actually asks you to make are three: which meetings to record,
// what the notes should look like, and whether attendees get them. Those go
// first, written as the sentence they are. Everything else is account.

export default async function SettingsPage() {
  const { uid, user } = await requireWorkspace();
  const settings = await loadSettings(uid);
  return (
    <div className="mx-auto w-full max-w-[760px] px-4 pb-24 md:px-8">
      <PageHeader title="Settings" subtitle="Three decisions, then your account." />
      <SettingsForm
        initial={settings}
        templates={TEMPLATES.map((t) => ({ key: t.key, label: t.label }))}
        user={user}
        connectCalendar={
          <ConnectCalendarButton
            label={settings?.calendarConnected ? "Reconnect" : "Connect Google Calendar"}
            className="rounded-full px-3.5 py-[8px] text-[13px] font-semibold"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          />
        }
        signOut={<SignOutButton className="rounded-full px-3.5 py-[8px] text-[13px] font-medium" style={{ color: "var(--ink-2)", border: "1px solid var(--line-strong)" }} />}
      />
    </div>
  );
}
