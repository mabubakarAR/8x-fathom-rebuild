import { SignInButton } from "../sign-in-button";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    per: "forever",
    blurb: "For anyone who wants to stop typing during calls.",
    items: ["Unlimited recordings & transcripts", "Speaker lanes for up to 8 voices", "5 cited AI summaries a month", "Chrome extension for Meet"],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Pro",
    price: "$19",
    per: "per month",
    blurb: "For people whose calendar is mostly calls.",
    items: ["Everything in Free", "Unlimited cited summaries", "Ask across your whole history", "Speaker repair & auto chapters", "Export to .md, .vtt, .srt, .json"],
    cta: "Start 14-day trial",
    featured: true,
  },
  {
    name: "Team",
    price: "$29",
    per: "per seat / month",
    blurb: "For teams that share decisions, not just notes.",
    items: ["Everything in Pro", "Shared meeting library", "Slack, Notion & CRM sync", "Admin controls & SSO", "Priority support"],
    cta: "Talk to us",
    featured: false,
  },
];

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className="mt-[3px] shrink-0" aria-hidden>
      <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-[1200px]">
        <div className="lp-reveal mx-auto max-w-[640px] text-center">
          <p className="mono text-[12px] text-(--accent-ink)">Proposed pricing</p>
          <h2 className="display mt-4 text-[42px] text-balance md:text-[56px]">
            Simple pricing. <em>Start for free.</em>
          </h2>
          <p className="mt-4 text-[16px] leading-[1.6] text-(--ink-3)">How this would be sold. Nothing is charged today &mdash; every plan below is the free one while this is a take-home.</p>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`lp-reveal flex flex-col rounded-[22px] p-7 md:p-8 ${p.featured ? "lp-dark shadow-[0_30px_60px_-30px_oklch(20%_0.01_260/0.6)]" : "lp-panel"}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[16px] font-semibold text-(--ink)">{p.name}</h3>
                {p.featured && <span className="rounded-full bg-(--accent) px-2.5 py-0.5 text-[11.5px] font-semibold text-(--on-accent)">Most popular</span>}
              </div>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="display text-[52px]">{p.price}</span>
                <span className="text-[14px] text-(--ink-3)">{p.per}</span>
              </div>
              <p className="mt-2 text-[14.5px] leading-[1.55] text-(--ink-3)">{p.blurb}</p>
              <ul className="mt-7 flex flex-1 flex-col gap-3 border-t border-(--line) pt-7">
                {p.items.map((i) => (
                  <li key={i} className="flex gap-3 text-[14.5px] text-(--ink-2)">
                    <span className="text-(--accent)"><Check /></span>
                    {i}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                {p.name === "Team" ? (
                  <a
                    href="mailto:hello@fathom-rebuild.dev"
                    className="inline-flex h-11 w-full items-center justify-center rounded-full border border-(--line-strong) text-[14.5px] font-medium text-(--ink) transition-colors hover:bg-(--bg)"
                  >
                    {p.cta}
                  </a>
                ) : (
                  <SignInButton
                    label={p.cta}
                    className={`inline-flex h-11 w-full items-center justify-center rounded-full text-[14.5px] font-medium transition-transform hover:-translate-y-0.5 ${
                      p.featured ? "bg-(--accent) text-(--on-accent)" : "bg-(--ink) text-(--bg)"
                    }`}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FAQS = [
  {
    q: "Does a bot join my meetings?",
    a: "No. You share the meeting tab from your browser and the recorder listens to that audio. Nothing appears in the participant list, and nothing records until you press record.",
  },
  {
    q: "Which meeting apps does it work with?",
    a: "Anything that runs in a browser tab — Google Meet, Zoom, Microsoft Teams, Webex, Whereby. The Chrome extension adds a Record button directly inside Google Meet.",
  },
  {
    q: "How accurate are the summaries?",
    a: "Every line of a summary is checked against the transcript before you see it and links to the exact second it came from. If a claim can't be verified, it's dropped and we tell you which one.",
  },
  {
    q: "What happens when people talk over each other?",
    a: "Each voice gets its own lane. Overlapping speech is flagged as crosstalk instead of being silently merged, and you can reassign a speaker once to fix every line they said.",
  },
  {
    q: "Who can see my recordings?",
    a: "Only you, unless you share a meeting. Recordings and transcripts are tied to your Google account, and you can export or delete them at any time.",
  },
  {
    q: "Can I export my transcripts?",
    a: "Yes — Markdown, WebVTT, SRT and JSON, with speakers and timestamps intact, so they drop straight into docs, video editors or your own tools.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 border-t border-(--line) px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
        <div className="lp-reveal">
          <h2 className="display text-[42px] text-balance md:text-[52px]">
            Questions, <em>answered.</em>
          </h2>
          <p className="mt-4 max-w-[34ch] text-[16px] leading-[1.6] text-(--ink-3)">
            Something else on your mind? Email{" "}
            <a href="mailto:hello@fathom-rebuild.dev" className="text-(--ink) underline decoration-(--line-strong) underline-offset-4 hover:decoration-(--ink)">
              hello@fathom-rebuild.dev
            </a>
          </p>
        </div>
        <div className="border-t border-(--line)">
          {FAQS.map((f) => (
            <details key={f.q} className="lp-faq group border-b border-(--line)">
              <summary className="flex items-center justify-between gap-6 py-6 text-[17px] font-medium text-(--ink) md:text-[18px]">
                {f.q}
                <span className="lp-faq-icon grid h-8 w-8 shrink-0 place-items-center rounded-full border border-(--line-strong) text-(--ink-2)" aria-hidden>
                  <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                </span>
              </summary>
              <p className="max-w-[62ch] pb-6 text-[15.5px] leading-[1.65] text-(--ink-3)">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
