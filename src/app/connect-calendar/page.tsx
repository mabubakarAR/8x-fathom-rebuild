import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ConnectCalendarButton } from "@/components/sign-in-button";
import { requireWorkspace } from "@/lib/data/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Connect Google Calendar — Noted" };

/**
 * The step before Google's "unverified app" screen.
 *
 * That screen is the single most likely place for someone to stop: it is
 * red, it says "unsafe", and nothing on it explains why it appeared. This
 * page shows the exact screen and the two clicks through it before the
 * user gets there, so the warning arrives as something expected. It is not
 * possible to remove the warning without Google's verification review,
 * which takes weeks and a registered product; it is possible to make sure
 * nobody is surprised by it.
 */
export default async function ConnectCalendarPage() {
  const { user } = await requireWorkspace();

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 pb-24 md:px-8">
      <PageHeader
        title="Connect Google Calendar"
        subtitle="Read-only. Two extra clicks on Google's side, explained below, then your next seven days appear with a recording decision each."
      />

      {user.guest ? (
        <div className="rounded-[var(--radius-lg)] p-5 text-[14px]" style={{ background: "var(--surface)", border: "1px solid var(--line)", color: "var(--ink-2)" }}>
          A guest workspace has no Google account behind it, so there is no calendar to read.{" "}
          <Link href="/" className="underline" style={{ color: "var(--accent-ink)" }}>Sign in with Google instead</Link>.
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-[1.1fr_1fr]">
            <div className="flex flex-col gap-4 text-[14px] leading-[1.65]" style={{ color: "var(--ink-2)" }}>
              <p>
                <strong style={{ color: "var(--ink)" }}>Why Google shows a warning.</strong> Reading a calendar is a
                &ldquo;sensitive&rdquo; permission. Google only removes the warning after a verification review of a
                registered product — a process that takes weeks. Noted is a few days old, so the screen on the right
                will appear. It is the same screen every unreleased app shows.
              </p>
              <ol className="flex flex-col gap-3">
                <Step n="1" t="Pick your Google account" />
                <Step n="2" t="On the red screen, click Advanced" b="It is small grey text at the bottom left." />
                <Step n="3" t="Click “Go to ainoted.vercel.app (unsafe)”" b="“Unsafe” is Google’s word for “unreviewed”. Nothing is written to your calendar — the permission asked for is read-only." />
                <Step n="4" t="Tick the calendar box, then Continue" b="Google lists the permissions; the calendar one must be ticked or the connection fails." />
              </ol>
              <p className="text-[12.5px]" style={{ color: "var(--ink-faint)" }}>
                What is read: the next seven days of events with a video link — title, time, attendees. What is stored:
                a refresh token on your user row, removable from Settings → Disconnect. Nothing else.
              </p>
              <div className="mt-1">
                <ConnectCalendarButton
                  label="Continue to Google"
                  className="rounded-full px-5 py-[11px] text-[14px] font-semibold"
                  style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                />
              </div>
            </div>

            <GoogleWarningMock />
          </section>
        </>
      )}
    </div>
  );
}

function Step({ n, t, b }: { n: string; t: string; b?: string }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-semibold tnum" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>{n}</span>
      <div>
        <div className="font-medium" style={{ color: "var(--ink)" }}>{t}</div>
        {b && <div className="text-[12.5px]" style={{ color: "var(--ink-3)" }}>{b}</div>}
      </div>
    </li>
  );
}

/* A drawing of the screen Google shows, with the two clicks marked. */
function GoogleWarningMock() {
  return (
    <div className="self-start rounded-[var(--radius-lg)] p-3" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
      <div className="text-[11px] font-semibold tracking-[0.08em] uppercase" style={{ color: "var(--ink-faint)" }}>What you will see</div>
      <div className="mt-2 overflow-hidden rounded-[10px] bg-white text-[#202124] shadow-[0_2px_10px_rgba(0,0,0,.12)]" style={{ fontFamily: "Roboto, Arial, sans-serif" }}>
        <div className="flex items-center gap-2 border-b border-[#dadce0] px-4 py-2.5 text-[12px] text-[#5f6368]">
          <span className="font-medium text-[#4285f4]">G</span> Sign in with Google
        </div>
        <div className="px-5 py-5">
          <div className="text-[17px] font-medium leading-snug">Google hasn&rsquo;t verified this app</div>
          <p className="mt-2 text-[12.5px] leading-[1.5] text-[#5f6368]">
            The app is requesting access to sensitive info in your Google Account. Until the developer
            (muhammad@internationalshowtimes.com) verifies this app with Google, you shouldn&rsquo;t use it.
          </p>
          <div className="mt-5 flex items-center justify-between">
            <span className="relative inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[12.5px] text-[#5f6368] ring-2 ring-[var(--accent)]">
              Advanced
              <Pin n="2" />
            </span>
            <span className="rounded-[4px] bg-[#1a73e8] px-4 py-1.5 text-[12.5px] font-medium text-white">Back to safety</span>
          </div>
          <div className="mt-4 border-t border-[#dadce0] pt-3 text-[12px] text-[#5f6368]">
            Continue only if you understand the risks and trust the developer.
            <div className="mt-2">
              <span className="relative inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[#1a73e8] underline ring-2 ring-[var(--accent)]">
                Go to ainoted.vercel.app (unsafe)
                <Pin n="3" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Pin({ n }: { n: string }) {
  return (
    <span className="absolute -top-2.5 -right-2.5 grid h-5 w-5 place-items-center rounded-full text-[10.5px] font-bold" style={{ background: "var(--accent)", color: "var(--on-accent)" }}>{n}</span>
  );
}
