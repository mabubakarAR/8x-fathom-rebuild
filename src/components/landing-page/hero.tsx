import Image from "next/image";
import { SignInButton } from "../sign-in-button";

const AVATARS = ["/landing/p-maya.png", "/landing/p-daniel.png", "/landing/p-sofia.png", "/landing/p-kenji.png"];

export function Hero() {
  return (
    <section className="relative px-5 pt-14 pb-20 md:px-8 md:pt-20 md:pb-28">
      <div className="mx-auto grid max-w-[1200px] items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <div>
          <a
            href="#how"
            className="lp-in group inline-flex items-center gap-2.5 rounded-full border border-(--line) bg-(--surface) py-1 pr-3 pl-1 text-[13px] text-(--ink-2) transition-colors hover:border-(--line-strong)"
          >
            <span className="rounded-full bg-(--accent) px-2 py-0.5 text-[11px] font-semibold text-(--on-accent)">New</span>
            Ask across every meeting you&apos;ve ever had
            <span className="text-(--ink-faint) transition-transform group-hover:translate-x-0.5" aria-hidden>&rarr;</span>
          </a>

          <h1 className="display lp-in mt-7 text-[52px] text-balance sm:text-[68px] xl:text-[84px]" style={{ animationDelay: "0.06s" }}>
            Be in the meeting. <em>Not in your notes.</em>
          </h1>

          <p className="lp-in mt-6 max-w-[48ch] text-[17px] leading-[1.6] text-pretty text-(--ink-2) md:text-[18.5px]" style={{ animationDelay: "0.12s" }}>
            Fathom Rebuild records, transcribes and summarises your calls without a bot in the room — so you can give people your full attention and still leave with every decision.
          </p>

          <div className="lp-in mt-9 flex flex-col gap-3 sm:flex-row sm:items-center" style={{ animationDelay: "0.18s" }}>
            <SignInButton
              label="Start free with Google"
              className="inline-flex h-12 items-center justify-center rounded-full bg-(--ink) px-6 text-[15px] font-medium text-(--bg) transition-transform duration-300 hover:-translate-y-0.5"
            />
            <a
              href="#demo"
              className="inline-flex h-12 items-center justify-center gap-2.5 rounded-full border border-(--line-strong) px-6 text-[15px] font-medium text-(--ink) transition-colors hover:bg-(--surface)"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden><path d="M4.5 3.2v9.6a.6.6 0 0 0 .9.5l7.6-4.8a.6.6 0 0 0 0-1L5.4 2.7a.6.6 0 0 0-.9.5z" fill="currentColor" /></svg>
              Watch it work
            </a>
          </div>

          <div className="lp-in mt-10 flex items-center gap-4" style={{ animationDelay: "0.24s" }}>
            <div className="flex">
              {AVATARS.map((src, i) => (
                <Image key={src} src={src} alt="" width={36} height={36} className="-ml-2.5 h-9 w-9 rounded-full border-2 border-(--bg) object-cover first:ml-0" style={{ zIndex: AVATARS.length - i }} />
              ))}
            </div>
            <div className="text-[13.5px] leading-snug">
              <div className="flex items-center gap-1 text-(--ink)" aria-label="Rated 4.9 out of 5">
                {Array.from({ length: 5 }, (_, i) => (
                  <svg key={i} width="13" height="13" viewBox="0 0 20 20" aria-hidden><path fill="currentColor" d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.9l-5.2 2.8 1-5.9L1.5 7.7l5.9-.8z" /></svg>
                ))}
                <span className="ml-1.5 font-semibold">4.9</span>
              </div>
              <div className="text-(--ink-3)">from 2,300+ teams who stopped typing</div>
            </div>
          </div>
        </div>

        <HeroVisual />
      </div>
    </section>
  );
}

function HeroVisual() {
  return (
    <div className="lp-in relative mx-auto w-full max-w-[520px] lg:max-w-none" style={{ animationDelay: "0.2s" }}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] bg-(--bg-2)">
        <Image
          src="/landing/hero-call.png"
          alt="A product manager laughing on a video call at her desk while notes are taken for her"
          fill
          priority
          sizes="(min-width: 1024px) 560px, 92vw"
          className="object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent" aria-hidden />
      </div>

      <div className="lp-float-card lp-float absolute top-6 left-4 flex items-center gap-2.5 rounded-full px-3.5 py-2 sm:-left-6">
        <span className="lp-rec h-2 w-2 rounded-full bg-(--danger)" />
        <span className="mono text-[12px] font-medium text-(--ink)">00:43:17</span>
        <span className="h-3 w-px bg-(--line-strong)" aria-hidden />
        <span className="text-[12px] text-(--ink-3)">8 speakers · no bot</span>
      </div>

      <div className="lp-float-card lp-float-slow absolute right-4 bottom-6 left-4 rounded-[18px] p-4 sm:right-auto sm:-left-10 sm:w-[330px]">
        <div className="flex items-center justify-between">
          <span className="rounded-md bg-(--accent-soft) px-2 py-0.5 text-[11px] font-semibold text-(--accent-ink)">Decision</span>
          <span className="text-[11.5px] text-(--ink-faint)">Q4 Roadmap Lock</span>
        </div>
        <p className="mt-2.5 text-[14.5px] leading-[1.45] font-medium text-(--ink)">Search slips to late January, after the Brightwater renewal.</p>
        <div className="mt-3 flex items-center gap-2 text-[12px] text-(--ink-3)">
          <Image src="/landing/p-sofia.png" alt="" width={20} height={20} className="h-5 w-5 rounded-full object-cover" />
          <span>Ayesha K.</span>
          <span className="mono ml-auto rounded-md border border-(--line) px-1.5 py-0.5 text-[11px] text-(--ink-2)">43:17</span>
        </div>
      </div>

      <div className="lp-float-card lp-float absolute top-[38%] right-4 hidden items-center gap-3 rounded-[16px] px-4 py-3 sm:-right-6 sm:flex">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-(--accent) text-(--on-accent)" aria-hidden>
          <svg width="14" height="14" viewBox="0 0 16 16"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold text-(--ink)">Summary ready</div>
          <div className="text-[12px] text-(--ink-3)">12s after the call · 29 citations</div>
        </div>
      </div>
    </div>
  );
}
