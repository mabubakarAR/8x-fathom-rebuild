import Link from "next/link";
import { SignInButton } from "./sign-in-button";
import { Mark } from "./shell";
import { Sonar } from "./landing-page/sonar";
import { HeroDemo } from "./landing-page/hero-demo";
import { Depth } from "./landing-page/depth";
import { Features } from "./landing-page/features";
import "./landing-page/landing.css";

// The front door. The name is a unit of depth, so the page is a descent:
// a sonar ping at the surface, a live room being turned into cited notes,
// then five fathoms down from "record" to "ask".

const GITHUB = "https://github.com/mabubakarAR/8x-fathom-rebuild";
const PLATFORMS = ["Google Meet", "Zoom", "Microsoft Teams", "Google Calendar", "Chrome", "Any browser tab", "Webex", "Whereby"];
const STATS = [
  { v: "0", l: "bots in your meeting" },
  { v: "8", l: "voices kept apart" },
  { v: "100%", l: "of claims cited" },
  { v: "4", l: "export formats" },
];

const primaryCta =
  "inline-flex items-center rounded-full px-6 py-[14px] text-[15px] font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_40px_-8px_oklch(84%_0.15_172/0.6)]";

export function Landing() {
  return (
    <main className="lp relative min-h-screen font-sans">
      <header className="frosted sticky top-0 z-50 border-b" style={{ borderColor: "var(--line)", background: "oklch(12% 0.02 245 / 0.88)" }}>
        <nav className="mx-auto flex w-full max-w-[1160px] items-center justify-between px-5 py-3.5 md:px-6" aria-label="Main">
          <Link href="/" className="flex items-center gap-2.5" style={{ color: "var(--ink)" }}>
            <Mark />
            <span className="text-[15px] font-semibold tracking-tight">Fathom Rebuild</span>
          </Link>
          <div className="flex items-center gap-6">
            <a href="#depth" className="hidden text-[13.5px] font-medium transition-colors hover:text-white md:block" style={{ color: "var(--ink-3)" }}>How it works</a>
            <a href="#features" className="hidden text-[13.5px] font-medium transition-colors hover:text-white md:block" style={{ color: "var(--ink-3)" }}>Features</a>
            <a href={GITHUB} className="hidden text-[13.5px] font-medium transition-colors hover:text-white sm:block" style={{ color: "var(--ink-3)" }} rel="noopener noreferrer" target="_blank">Source</a>
            <SignInButton
              label="Sign in"
              className="inline-flex items-center rounded-full px-4 py-[8px] text-[13px] font-semibold transition-colors hover:bg-white/10"
              style={{ color: "var(--ink)", border: "1px solid var(--line-strong)" }}
            />
          </div>
        </nav>
      </header>

      {/* hero */}
      <section className="relative isolate px-5 pt-20 md:px-6 md:pt-28">
        <div className="lp-grid-bg pointer-events-none absolute inset-0 -z-10" aria-hidden />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px]"
          style={{ background: "radial-gradient(60% 50% at 50% 20%, oklch(60% 0.12 190 / 0.22), transparent 70%)" }}
          aria-hidden
        />
        <Sonar size={1100} className="-top-[330px] -z-10 opacity-80" />

        <div className="mx-auto flex max-w-[900px] flex-col items-center text-center">
          <div
            className="lp-in inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium"
            style={{ background: "oklch(100% 0 0 / 0.05)", border: "1px solid var(--line-strong)", color: "var(--ink-2)" }}
          >
            <span className="lp-rec h-1.5 w-1.5 rounded-full" style={{ background: "var(--danger)" }} />
            AI meeting notes · no bot required
          </div>
          <h1 className="display lp-in mt-7 text-[58px] leading-[0.95] text-balance sm:text-[84px] md:text-[112px]" style={{ animationDelay: "0.08s" }}>
            Every meeting, <em>fathomed.</em>
          </h1>
          <p className="lp-in mt-7 max-w-[56ch] text-[16.5px] leading-[1.6] text-pretty md:text-[18px]" style={{ color: "var(--ink-3)", animationDelay: "0.16s" }}>
            It listens to the whole room — eight voices, one hour, zero bots — and hands back notes where every claim points to the second it was said.
          </p>
          <div className="lp-in mt-9 flex flex-col items-center gap-3 sm:flex-row" style={{ animationDelay: "0.24s" }}>
            <SignInButton className={primaryCta} style={{ background: "var(--ink)", color: "oklch(13% 0.02 245)" }} />
            <a href="#depth" className="inline-flex items-center gap-2 px-4 py-3 text-[14.5px] font-medium transition-colors hover:text-white" style={{ color: "var(--ink-2)" }}>
              See how deep it goes
              <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden><path d="M8 2v12m-5-5 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
          </div>
          <p className="lp-in mt-4 text-[12.5px]" style={{ color: "var(--ink-faint)", animationDelay: "0.3s" }}>
            Free to start · Google sign-in · Nothing records until you press record
          </p>
        </div>

        <div className="lp-in relative mx-auto mt-16 max-w-[1080px] md:mt-20" style={{ animationDelay: "0.4s" }}>
          <div className="absolute -inset-x-10 -inset-y-6 -z-10 rounded-[40px] blur-3xl" style={{ background: "radial-gradient(50% 50% at 50% 50%, oklch(84% 0.15 172 / 0.12), transparent)" }} aria-hidden />
          <HeroDemo />
        </div>
      </section>

      {/* platforms */}
      <section className="mt-20 md:mt-24" aria-label="Works with">
        <p className="text-center text-[11.5px] font-semibold tracking-[0.16em] uppercase" style={{ color: "var(--ink-faint)" }}>Works where you already meet</p>
        <div className="lp-marquee mt-6 overflow-hidden">
          <ul className="lp-marquee-track flex w-max gap-14 pr-14">
            {[...PLATFORMS, ...PLATFORMS].map((p, i) => (
              <li key={i} aria-hidden={i >= PLATFORMS.length} className="display whitespace-nowrap text-[28px] md:text-[34px]" style={{ color: "var(--ink-3)" }}>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* descent */}
      <section id="depth" className="relative mt-28 scroll-mt-20 px-5 md:mt-36 md:px-6" style={{ background: "linear-gradient(180deg, var(--bg), var(--bg-deep) 40%, var(--bg-deep) 70%, var(--bg))" }}>
        <div className="mx-auto max-w-[1160px]">
          <div className="lp-reveal max-w-[720px]">
            <p className="text-[12px] font-semibold tracking-[0.16em] uppercase" style={{ color: "var(--accent)" }}>How it works</p>
            <h2 className="display mt-3 text-[44px] leading-[1] text-balance md:text-[68px]">
              From the surface to <em>the source.</em>
            </h2>
            <p className="mt-4 max-w-[52ch] text-[16px] leading-[1.6]" style={{ color: "var(--ink-3)" }}>
              A fathom is six feet of depth. Here are five of them — from pressing record to asking your whole history a question.
            </p>
          </div>
          <div className="mt-14 md:mt-4">
            <Depth />
          </div>
        </div>
      </section>

      {/* stats */}
      <section className="mx-auto mt-24 max-w-[1160px] px-5 md:px-6">
        <dl className="lp-reveal grid grid-cols-2 gap-px overflow-hidden rounded-[22px] md:grid-cols-4" style={{ border: "1px solid var(--line)", background: "var(--line)" }}>
          {STATS.map((s) => (
            <div key={s.l} className="p-6 md:p-8" style={{ background: "var(--bg)" }}>
              <dt className="sr-only">{s.l}</dt>
              <dd>
                <div className="display text-[52px] leading-none tnum md:text-[64px]">{s.v}</div>
                <div className="mt-2 text-[13.5px]" style={{ color: "var(--ink-3)" }}>{s.l}</div>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* features */}
      <section id="features" className="mx-auto mt-28 max-w-[1160px] scroll-mt-20 px-5 md:mt-36 md:px-6">
        <div className="lp-reveal mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <h2 className="display max-w-[14ch] text-[44px] leading-[1] text-balance md:text-[60px]">
            Built for the <em>hard</em> meeting.
          </h2>
          <p className="max-w-[40ch] text-[15px] leading-[1.6]" style={{ color: "var(--ink-3)" }}>
            Two-person calls are easy. These are the details that hold up when eight people talk for an hour.
          </p>
        </div>
        <Features />
      </section>

      {/* final cta */}
      <section className="relative isolate mt-32 overflow-hidden px-5 pt-28 pb-32 md:mt-40 md:px-6 md:pt-36 md:pb-40">
        <Sonar size={900} className="top-1/2 -z-10 -translate-y-1/2 opacity-70" />
        <div className="pointer-events-none absolute inset-0 -z-10" style={{ background: "radial-gradient(40% 50% at 50% 50%, oklch(60% 0.12 190 / 0.18), transparent 70%)" }} aria-hidden />
        <div className="lp-reveal mx-auto flex max-w-[760px] flex-col items-center text-center">
          <Mark size={44} />
          <h2 className="display mt-8 text-[48px] leading-[0.98] text-balance md:text-[84px]">
            Stop taking notes. <em>Start listening.</em>
          </h2>
          <p className="mt-6 max-w-[46ch] text-[16px] leading-[1.6]" style={{ color: "var(--ink-3)" }}>
            Sign in with Google, press record on your next call, and read the notes before you&apos;ve left the tab.
          </p>
          <div className="mt-9">
            <SignInButton className={primaryCta} style={{ background: "var(--accent)", color: "oklch(16% 0.03 172)" }} />
          </div>
        </div>
      </section>

      <footer className="border-t" style={{ borderColor: "var(--line)" }}>
        <div className="mx-auto flex max-w-[1160px] flex-col gap-4 px-5 py-8 text-[12.5px] md:flex-row md:items-center md:justify-between md:px-6" style={{ color: "var(--ink-faint)" }}>
          <div className="flex items-center gap-2.5">
            <Mark size={18} />
            <span>Fathom Rebuild — not affiliated with Fathom.</span>
          </div>
          <div className="flex gap-6">
            <a href={GITHUB} className="transition-colors hover:text-white" rel="noopener noreferrer" target="_blank">GitHub</a>
            <Link href="/privacy" className="transition-colors hover:text-white">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-white">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
