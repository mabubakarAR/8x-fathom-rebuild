import Link from "next/link";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import { SignInButton } from "./sign-in-button";
import { Mark } from "./shell";
import { Hero } from "./landing-page/hero";
import { Logos } from "./landing-page/logos";
import { HeroDemo } from "./landing-page/hero-demo";
import { Stats, Story, Testimonials } from "./landing-page/proof";
import { Depth } from "./landing-page/depth";
import { Features } from "./landing-page/features";
import { Pricing, Faq } from "./landing-page/pricing";
import "./landing-page/landing.css";

const sans = Inter_Tight({ subsets: ["latin"], variable: "--lp-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--lp-mono", weight: ["400", "500"], display: "swap" });

const GITHUB = "https://github.com/mabubakarAR/8x-fathom-rebuild";

const NAV = [
  { href: "#demo", label: "Product" },
  { href: "#how", label: "How it works" },
  { href: "#customers", label: "Customers" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

const FOOTER = [
  { h: "Product", l: [["Features", "#features"], ["How it works", "#how"], ["Pricing", "#pricing"], ["Chrome extension", "/extension/fathom-rebuild-extension.zip"]] },
  { h: "Company", l: [["Customers", "#customers"], ["About", "/about"], ["Contact", "mailto:hello@fathom-rebuild.dev"]] },
  { h: "Resources", l: [["FAQ", "#faq"], ["Source code", GITHUB]] },
  { h: "Legal", l: [["Privacy", "/privacy"], ["Terms", "/terms"]] },
];

function SectionHead({ label, title, body, dark }: { label: string; title: React.ReactNode; body: string; dark?: boolean }) {
  return (
    <div className="lp-reveal flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        <p className={`mono text-[12px] ${dark ? "text-(--accent-ink)" : "text-(--accent-ink)"}`}>{label}</p>
        <h2 className="display mt-4 max-w-[17ch] text-[42px] text-balance md:text-[60px]">{title}</h2>
      </div>
      <p className="max-w-[40ch] text-[16px] leading-[1.6] text-(--ink-3)">{body}</p>
    </div>
  );
}

export function Landing() {
  return (
    <main className={`lp ${sans.variable} ${mono.variable} relative min-h-screen antialiased`}>
      <header className="sticky top-0 z-50 border-b border-(--line) bg-[oklch(97.2%_0.006_85/0.82)] backdrop-blur-xl">
        <nav className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-5 md:px-8" aria-label="Main">
          <Link href="/" className="flex items-center gap-2.5 text-(--ink)">
            <Mark size={22} />
            <span className="text-[15.5px] font-semibold tracking-[-0.02em]">Fathom Rebuild</span>
          </Link>
          <div className="hidden items-center gap-8 lg:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="text-[14px] text-(--ink-2) transition-colors hover:text-(--ink)">
                {n.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <SignInButton
              label="Log in"
              className="hidden h-9 items-center rounded-full px-3.5 text-[14px] font-medium text-(--ink-2) transition-colors hover:text-(--ink) sm:inline-flex [&>svg]:hidden"
            />
            <SignInButton
              label="Get started"
              className="inline-flex h-9 items-center rounded-full bg-(--ink) px-4 text-[14px] font-medium text-(--bg) transition-transform hover:-translate-y-px [&>svg]:hidden"
            />
          </div>
        </nav>
      </header>

      <Hero />
      <Logos />

      <section id="demo" className="scroll-mt-20 px-3 pt-20 md:px-5 md:pt-28">
        <div className="lp-dark mx-auto max-w-[1360px] overflow-hidden rounded-[32px] px-5 py-16 md:px-12 md:py-24">
          <div className="mx-auto max-w-[1080px]">
            <SectionHead
              dark
              label="Live, as it happens"
              title={<>One hour. Eight voices. <em>One page of notes.</em></>}
              body="Watch a real planning call get split into speaker lanes, then condensed into decisions and actions — each one linked to the moment it was said."
            />
            <div className="lp-reveal mt-12 md:mt-16">
              <HeroDemo />
            </div>
          </div>
        </div>
      </section>

      <Stats />
      <Story />

      <section id="how" className="lp-dark scroll-mt-16 px-5 pt-24 pb-10 md:px-8 md:pt-32">
        <div className="mx-auto max-w-[1200px]">
          <SectionHead
            dark
            label="How it works"
            title={<>From the surface <em>to the source.</em></>}
            body="A fathom is six feet of depth. Here are five of them — from pressing record to asking your whole history a question."
          />
          <div className="mt-14 md:mt-6">
            <Depth />
          </div>
        </div>
      </section>

      <section id="features" className="scroll-mt-20 px-5 py-24 md:px-8 md:py-32">
        <div className="mx-auto max-w-[1200px]">
          <SectionHead
            label="Built for the hard meeting"
            title={<>Two-person calls are easy. <em>We built for eight.</em></>}
            body="The details that hold up when a room full of people talk over each other for an hour."
          />
          <div className="mt-14">
            <Features />
          </div>
        </div>
      </section>

      <Testimonials />
      <Pricing />
      <Faq />

      <section className="px-3 pb-3 md:px-5 md:pb-5">
        <div className="lp-dark mx-auto flex max-w-[1360px] flex-col items-center overflow-hidden rounded-[32px] px-6 py-24 text-center md:py-32">
          <span className="text-(--ink)"><Mark size={40} /></span>
          <h2 className="display lp-reveal mt-8 max-w-[18ch] text-[46px] text-balance md:text-[76px]">
            Your next call is the first <em>you won&apos;t have to remember.</em>
          </h2>
          <p className="mt-6 max-w-[44ch] text-[16.5px] leading-[1.6] text-(--ink-3)">
            Sign in with Google, press record, and read the notes before you&apos;ve closed the tab.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
            <SignInButton
              label="Start free with Google"
              className="inline-flex h-12 items-center rounded-full bg-(--ink) px-6 text-[15px] font-medium text-(--bg) transition-transform hover:-translate-y-0.5"
            />
            <a href="#pricing" className="inline-flex h-12 items-center rounded-full border border-(--line-strong) px-6 text-[15px] font-medium text-(--ink) transition-colors hover:bg-(--surface)">
              See pricing
            </a>
          </div>
          <p className="mt-5 text-[13px] text-(--ink-faint)">Free forever plan · No credit card · Nothing records until you press record</p>
        </div>
      </section>

      <footer className="px-5 pt-16 pb-10 md:px-8">
        <div className="mx-auto max-w-[1200px]">
          <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
            <div>
              <div className="flex items-center gap-2.5 text-(--ink)">
                <Mark size={22} />
                <span className="text-[15.5px] font-semibold tracking-[-0.02em]">Fathom Rebuild</span>
              </div>
              <p className="mt-4 max-w-[30ch] text-[14px] leading-[1.6] text-(--ink-3)">The AI notetaker that listens without joining. Cited notes for every call.</p>
            </div>
            {FOOTER.map((col) => (
              <div key={col.h}>
                <h3 className="text-[13px] font-semibold text-(--ink)">{col.h}</h3>
                <ul className="mt-4 flex flex-col gap-3">
                  {col.l.map(([label, href]) => (
                    <li key={label}>
                      <a href={href} className="text-[14px] text-(--ink-3) transition-colors hover:text-(--ink)" {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-16 flex flex-col gap-3 border-t border-(--line) pt-6 text-[13px] text-(--ink-faint) md:flex-row md:justify-between">
            <span>&copy; 2026 Fathom Rebuild. Not affiliated with Fathom.</span>
            <span className="mono">Made for people who&apos;d rather listen.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
