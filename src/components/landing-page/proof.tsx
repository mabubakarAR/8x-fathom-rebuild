import Image from "next/image";

const STATS = [
  { v: "2.1M", l: "hours of meetings transcribed" },
  { v: "12s", l: "median time from hang-up to summary" },
  { v: "0", l: "bots joining your calls, ever" },
  { v: "94%", l: "of users stop taking manual notes" },
];

export function Stats() {
  return (
    <section className="px-5 py-20 md:px-8 md:py-28">
      <dl className="lp-reveal mx-auto grid max-w-[1200px] grid-cols-2 gap-y-10 md:grid-cols-4">
        {STATS.map((s, i) => (
          <div key={s.l} className={`pr-6 ${i > 0 ? "md:border-l md:border-(--line) md:pl-8" : ""}`}>
            <dt className="order-2 mt-3 max-w-[22ch] text-[14.5px] leading-snug text-(--ink-3)">{s.l}</dt>
            <dd className="display order-1 text-[56px] md:text-[72px]">{s.v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function Story() {
  return (
    <section className="px-5 pb-24 md:px-8 md:pb-32">
      <div className="mx-auto grid max-w-[1200px] items-center gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
        <div className="lp-reveal relative aspect-[16/10] overflow-hidden rounded-[24px] bg-(--bg-2)">
          <Image
            src="/landing/team-room.png"
            alt="A product team in a sunlit meeting room with remote colleagues on a wall screen"
            fill
            sizes="(min-width: 1024px) 660px, 92vw"
            className="object-cover"
          />
        </div>
        <figure className="lp-reveal">
          <p className="mono text-[12px] text-(--accent-ink)">Case study · Northwind</p>
          <blockquote className="mt-5 text-[26px] leading-[1.3] font-medium tracking-[-0.02em] text-balance text-(--ink) md:text-[32px]">
            &ldquo;Our planning calls have eight people and three opinions each. Now nobody takes notes, and we still argue about the right things.&rdquo;
          </blockquote>
          <figcaption className="mt-8 flex items-center gap-3.5">
            <Image src="/landing/p-maya.png" alt="" width={48} height={48} className="h-12 w-12 rounded-full object-cover" />
            <div>
              <div className="text-[15px] font-semibold text-(--ink)">Maya Raman</div>
              <div className="text-[13.5px] text-(--ink-3)">Head of Product, Northwind</div>
            </div>
          </figcaption>
          <div className="mt-10 grid grid-cols-2 gap-6 border-t border-(--line) pt-6">
            <div>
              <div className="display text-[36px]">6 hrs</div>
              <div className="mt-1 text-[13.5px] text-(--ink-3)">saved per PM, every week</div>
            </div>
            <div>
              <div className="display text-[36px]">3&times;</div>
              <div className="mt-1 text-[13.5px] text-(--ink-3)">faster decision follow-ups</div>
            </div>
          </div>
        </figure>
      </div>
    </section>
  );
}

const QUOTES = [
  {
    q: "I used to spend the last ten minutes of every discovery call typing. Now I just ask the next question.",
    n: "Daniel Okafor",
    r: "Sales Director, Brightwater",
    img: "/landing/p-daniel.png",
  },
  {
    q: "The citations are the whole thing. When someone says 'we agreed to that?', I send them the second it was said.",
    n: "Sofia Lindqvist",
    r: "Engineering Manager, Fjord",
    img: "/landing/p-sofia.png",
  },
  {
    q: "It's the first AI tool our legal team didn't push back on. No bot, clear consent, nothing records by surprise.",
    n: "Kenji Watanabe",
    r: "Co-founder, Lumen Labs",
    img: "/landing/p-kenji.png",
  },
];

export function Testimonials() {
  return (
    <section id="customers" className="scroll-mt-20 bg-(--bg-2) px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-[1200px]">
        <div className="lp-reveal flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <h2 className="display max-w-[16ch] text-[42px] text-balance md:text-[56px]">
            Loved by people who <em>run a lot of meetings.</em>
          </h2>
          <p className="max-w-[38ch] text-[16px] leading-[1.6] text-(--ink-3)">
            Product leads, sellers, recruiters and founders — anyone whose day is back-to-back calls.
          </p>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {QUOTES.map((t) => (
            <figure key={t.n} className="lp-card lp-reveal flex flex-col justify-between p-7">
              <blockquote className="text-[17px] leading-[1.55] text-(--ink)">&ldquo;{t.q}&rdquo;</blockquote>
              <figcaption className="mt-10 flex items-center gap-3">
                <Image src={t.img} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
                <div>
                  <div className="text-[14px] font-semibold text-(--ink)">{t.n}</div>
                  <div className="text-[13px] text-(--ink-3)">{t.r}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
