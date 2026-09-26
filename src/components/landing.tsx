import Link from "next/link";
import { SignInButton } from "./sign-in-button";
import { Mark } from "./shell";
import { Icon } from "./ui";

// The front door.
//
// One claim, made three times with increasing specificity: the notes point
// at the line they came from. The middle of the page is not a screenshot,
// it is the actual thing — a summary bullet with its transcript line under
// it, and the ledger that says what was thrown away. If that is not enough
// to sign in for, a marketing page would not have been either.

export function Landing() {
  return (
    <main style={{ background: "var(--bg)", color: "var(--ink)" }}>
      {/* ---- top ---- */}
      <header className="mx-auto flex w-full max-w-[1080px] items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <Mark />
          <span className="text-[15px] font-semibold tracking-tight">Fathom Rebuild</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="https://github.com/mabubakarAR/8x-fathom-rebuild" className="hidden text-[13px] font-medium sm:block" style={{ color: "var(--ink-3)" }} rel="noopener" target="_blank">Source</a>
          <SignInButton label="Sign in" className="inline-flex items-center rounded-full px-4 py-[8px] text-[13px] font-semibold" style={{ background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--line-strong)" }} />
        </div>
      </header>

      {/* ---- hero ---- */}
      <section className="mx-auto w-full max-w-[1080px] px-6 pt-16 pb-14 md:pt-24">
        <p className="mb-5 text-[12px] font-semibold tracking-[0.12em] uppercase" style={{ color: "var(--accent)" }}>AI meeting notes</p>
        <h1 className="display max-w-[16ch] text-[46px] leading-[1.02] md:text-[76px]">
          Notes that show <em>which line</em> they came from.
        </h1>
        <p className="mt-6 max-w-[54ch] text-[17px] leading-[1.55]" style={{ color: "var(--ink-2)" }}>
          Record the call you&rsquo;re in — Zoom, Meet or Teams, no bot — and get a summary where every claim is checked against the transcript before you see it. Ask a question across every meeting you&rsquo;ve had and get the answer with the moment it was said.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <SignInButton className="inline-flex items-center rounded-full px-5 py-[13px] text-[14.5px] font-semibold transition-transform hover:scale-[1.02]" style={{ background: "var(--ink)", color: "var(--bg)" }} />
          <a href="#how" className="inline-flex items-center gap-1.5 px-2 py-2 text-[14px] font-medium" style={{ color: "var(--ink-2)" }}>
            See what a note looks like <Icon name="chevronDown" size={13} />
          </a>
        </div>
        <p className="mt-4 text-[12.5px]" style={{ color: "var(--ink-faint)" }}>
          Google sign-in connects your calendar. Nothing is recorded until you press record.
        </p>
      </section>

      {/* ---- the note ---- */}
      <section id="how" className="mx-auto w-full max-w-[1080px] px-6 pb-20">
        <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
          <div className="raised overflow-hidden rounded-[var(--radius-lg)]" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
            <div className="flex items-center gap-2 px-5 py-3 text-[11px] font-semibold tracking-[0.08em] uppercase" style={{ color: "var(--ink-faint)", borderBottom: "1px solid var(--line)" }}>
              Summary · Q4 Roadmap Lock · 54 min · 8 speakers
            </div>
            <div className="px-5 py-4">
              <div className="mb-1.5 text-[12px] font-semibold" style={{ color: "var(--ink-3)" }}>Decisions</div>
              <Claim
                text="Search improvements slip to late January — after Brightwater's renewal conversation."
                who="Ayesha Karim"
                at="43:17"
                line="Late January, honestly, if the decision goes yes."
              />
              <Claim
                text="The shadow index runs for four weeks before anyone decides."
                who="Rachel Moss"
                at="43:03"
                line="The shadow index takes four weeks of running before we decide, plus build time before that."
              />
              <Claim
                text="Marcus owns the rollback plan; Dani reviews it before it ships."
                who="Priya Raghunathan"
                at="51:40"
                line="Marcus writes the rollback plan by Wednesday and Dani reviews it before it goes out."
              />
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3 text-[11.5px] tnum" style={{ borderColor: "var(--line)", color: "var(--ink-faint)" }}>
                <span className="inline-flex items-center gap-1.5" style={{ color: "var(--ok)" }}><Icon name="check" size={12} /> 29 claims anchored</span>
                <span style={{ color: "var(--warn)" }}>1 discarded — cited line 340, transcript ends at 332</span>
                <span>claude-sonnet-4-5 · 18.2s</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Point n="01" title="Every claim is checked" body="The model cites transcript lines by number. Every number is verified on the server. One that doesn't resolve is dropped and named — never quietly repaired into something that looks right." />
            <Point n="02" title="Ask across every meeting" body="One question, answered from all of your calls, each sentence tied to the meeting, the speaker and the second. Ask whether something got decided and then reversed." />
            <Point n="03" title="The call you're actually in" body="Share the tab your call is in and it records the whole room. No bot joins, nothing is installed, and the share dialog is the consent step." />
          </div>
        </div>
      </section>

      {/* ---- three surfaces ---- */}
      <section className="mx-auto w-full max-w-[1080px] px-6 pb-20">
        <h2 className="display text-[32px] leading-[1.1] md:text-[40px]">Where you meet, <em>not</em> a new place to meet.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Surface title="Calendar" body="Sign in with Google and the next seven days appear with a recording decision already made — external guests, two-person, recurring — and the rule stated so you can override it before it matters." />
          <Surface title="Google Meet" body="A Chrome extension adds a Record button inside the call. It opens the recorder knowing which meeting you're in. Ten seconds to install, no permissions beyond meet.google.com." action={{ href: "/extension/fathom-rebuild-extension.zip", label: "Download the extension" }} />
          <Surface title="Any browser tab" body="Zoom and Teams in a browser tab work the same way. Your microphone and the tab's audio are mixed and recorded together; the far side is diarized into separate speakers." />
        </div>
      </section>

      {/* ---- footer ---- */}
      <footer className="mx-auto flex w-full max-w-[1080px] flex-wrap items-center gap-x-6 gap-y-2 px-6 pb-12 text-[12.5px]" style={{ color: "var(--ink-faint)" }}>
        <span>Built in a day for the 8x assignment. Not affiliated with Fathom.</span>
        <a href="https://github.com/mabubakarAR/8x-fathom-rebuild" className="underline" rel="noopener" target="_blank">GitHub</a>
        <Link href="/privacy" className="underline">Privacy</Link>
        <Link href="/terms" className="underline">Terms</Link>
      </footer>
    </main>
  );
}

function Claim({ text, who, at, line }: { text: string; who: string; at: string; line: string }) {
  return (
    <div className="py-2.5" style={{ borderBottom: "1px solid var(--line)" }}>
      <div className="flex items-start gap-2.5">
        <span className="mt-[7px] block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--accent)" }} />
        <div className="min-w-0">
          <p className="text-[14.5px] leading-[1.5]" style={{ color: "var(--ink)" }}>{text}</p>
          <p className="mt-1.5 rounded-[8px] px-2.5 py-1.5 text-[12.5px] leading-[1.45]" style={{ background: "var(--surface-2)", color: "var(--ink-2)" }}>
            <span className="tnum font-semibold" style={{ color: "var(--accent-ink)" }}>{at}</span>
            <span style={{ color: "var(--ink-3)" }}> · {who} — </span>
            &ldquo;{line}&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}

function Point({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] p-5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
      <div className="mb-1 text-[11px] font-semibold tracking-[0.1em] tnum" style={{ color: "var(--accent)" }}>{n}</div>
      <h3 className="text-[16px] font-semibold" style={{ color: "var(--ink)" }}>{title}</h3>
      <p className="mt-1.5 text-[13.5px] leading-[1.55]" style={{ color: "var(--ink-3)" }}>{body}</p>
    </div>
  );
}

function Surface({ title, body, action }: { title: string; body: string; action?: { href: string; label: string } }) {
  return (
    <div className="flex flex-col rounded-[var(--radius-lg)] p-5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
      <h3 className="display text-[24px]">{title}</h3>
      <p className="mt-2 flex-1 text-[13.5px] leading-[1.55]" style={{ color: "var(--ink-3)" }}>{body}</p>
      {action && (
        <a href={action.href} className="mt-4 inline-flex items-center gap-1.5 self-start text-[13px] font-semibold" style={{ color: "var(--accent-ink)" }}>
          <Icon name="download" size={13} /> {action.label}
        </a>
      )}
    </div>
  );
}
