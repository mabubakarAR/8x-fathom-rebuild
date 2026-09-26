import Link from "next/link";
import { PageHeader } from "@/components/page-header";

export const metadata = {
  title: "How it works — Noted",
};

/**
 * The honest page. Every claim on the landing page should be checkable
 * here, and anything that is a limitation is stated as one.
 */
export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-[760px] px-4 pb-24 md:px-8">
      <PageHeader
        title="How it works"
        subtitle="What happens between pressing record and reading the notes — and what this build does not do."
      />

      <div className="flex flex-col gap-6 text-[14px] leading-[1.68]" style={{ color: "var(--ink-2)" }}>
        <Section title="Capture">
          <ul className="flex flex-col gap-2">
            <Li label="No bot">
              Nothing joins your call. Recording happens in your own browser: press Record, Chrome
              asks which tab to share, and the tab&rsquo;s audio is captured with the standard
              screen-share dialog. Everyone in the meeting sees the same dialog you would see if a
              colleague started sharing.
            </Li>
            <Li label="Chrome extension">
              A Manifest V3 extension adds one button inside Google Meet, and opens the recorder by
              itself the moment you join a call, with your calendar rule already applied — record or
              skip, and why. It deliberately does not use the silent <code>tabCapture</code> API: the
              share dialog is the consent step, and it is the one click a browser cannot remove.
            </Li>
            <Li label="Calendar">
              Connecting Google Calendar is a separate consent from signing in, because it is a
              &ldquo;sensitive&rdquo; scope and Google shows an unverified-app warning for it. With
              it connected, the next seven days of meetings appear with a record / skip decision
              per call, driven by the rule you set in Settings.
            </Li>
          </ul>
        </Section>

        <Section title="Processing">
          <ul className="flex flex-col gap-2">
            <Li label="Transcription">
              Audio is transcribed server-side with speaker turns and timestamps. Speakers are
              matched to real people across meetings, so a voice labelled &ldquo;Speaker 2&rdquo;
              on Monday becomes Priya everywhere once you fix it once.
            </Li>
            <Li label="Cited notes">
              The summary is generated as a set of claims, and every claim must anchor to a
              transcript line or it is thrown away. The Evidence tab shows the funnel — proposed,
              anchored, discarded — including the discarded ones, so you can see what the model
              wanted to say and could not back up.
            </Li>
            <Li label="Ask">
              Questions across your whole history are answered by a hybrid search (BM25 plus
              embeddings) over every transcript you own, and each answer links to the second it
              came from.
            </Li>
          </ul>
        </Section>

        <Section title="Storage">
          <ul className="flex flex-col gap-2">
            <Li label="Postgres, per user">
              Meetings, transcripts, chapters, summaries, action items, clips, people and settings
              all live in Postgres, keyed to your Google account. There is no local-only state: the
              page you see is what the database returns.
            </Li>
            <Li label="Audio">
              Recordings are stored in blob storage when configured, otherwise in Postgres, and
              streamed back with range requests so the player can seek.
            </Li>
            <Li label="Sample workspace">
              Nine written-for-purpose meetings can be imported from Settings so you can try
              search and Ask before you have recorded anything. They are fiction, marked as
              sample, and removable in one click.
            </Li>
          </ul>
        </Section>

        <Section title="Not in this build">
          <ul className="flex flex-col gap-2">
            <Li label="Zoom and Teams sign-in">
              Only Google sign-in. Zoom and Teams links are still detected from the calendar and
              open in the recorder, but there is no native integration with either.
            </Li>
            <Li label="Desktop app">
              Everything is browser-based. A native app that captures system audio for calls
              outside a browser tab would be the next thing to build.
            </Li>
            <Li label="Verified OAuth">
              The Google OAuth client is unverified, which is why the calendar step shows a
              warning and why a temporary guest sign-in exists for reviewers on locked-down
              Workspace domains.
            </Li>
            <Li label="Billing, admin, mobile">
              The pricing page is a proposal. There is no billing, no team administration and no
              mobile app.
            </Li>
          </ul>
        </Section>

        <p className="mt-2 text-[13px]" style={{ color: "var(--ink-3)" }}>
          Source, including the full agent logs from building it, is on{" "}
          <a href="https://github.com/mabubakarAR/8x-fathom-rebuild" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--accent-ink)" }}>
            GitHub
          </a>
          . <Link href="/" className="underline" style={{ color: "var(--accent-ink)" }}>Back to Noted</Link>.
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="rounded-[var(--radius-lg)] p-5"
      style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
    >
      <h2 className="mb-2.5 text-[15px] font-semibold" style={{ color: "var(--ink)" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Li({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-col">
      <span className="text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
        {label}
      </span>
      <span className="text-[13.5px] leading-[1.65]">{children}</span>
    </li>
  );
}
