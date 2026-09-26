import { Icon } from "../ui";

const ZIP = "/extension/noted-extension.zip";

const STEPS = [
  { n: "01", t: "Download the extension", b: "A 6 KB zip. Runs only on meet.google.com; the one permission it asks for stores its on/off switch." },
  { n: "02", t: "Load it in Chrome", b: "chrome://extensions → Developer mode → Load unpacked → pick the unzipped folder." },
  { n: "03", t: "Join any Meet", b: "The recorder opens by itself with your calendar rule applied, and a Record button sits in the call bar. Approve the share dialog and Noted takes it from there." },
];

/**
 * The Chrome extension gets its own section rather than a card in the grid:
 * it is the answer to "how do I record a meeting I'm already in?", which is
 * the first question anyone asks.
 */
export function Extension() {
  return (
    <section id="extension" className="scroll-mt-20 px-3 pb-6 md:px-5 md:pb-8">
      <div className="lp-dark mx-auto max-w-[1360px] overflow-hidden rounded-[32px] px-5 py-16 md:px-12 md:py-24">
        <div className="mx-auto grid max-w-[1080px] items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div className="lp-reveal">
            <p className="mono text-[12px] text-(--accent-ink)">Chrome extension · Google Meet</p>
            <h2 className="display mt-4 max-w-[16ch] text-[42px] text-balance md:text-[60px]">
              The Record button <em>lives in the call.</em>
            </h2>
            <p className="mt-5 max-w-[42ch] text-[16px] leading-[1.6] text-(--ink-3)">
              No bot joins your meeting and nobody sees a stranger in the participant list. The extension
              puts one button into Google Meet; pressing it opens the recorder already knowing which call
              you&apos;re in. Chrome&apos;s own share dialog is the consent step — everyone on the call sees it.
            </p>
            <ol className="mt-9 flex flex-col gap-5">
              {STEPS.map((s) => (
                <li key={s.n} className="flex gap-4">
                  <span className="mono mt-1 w-7 shrink-0 text-[12px] text-(--accent-ink)">{s.n}</span>
                  <div>
                    <p className="text-[15.5px] font-medium text-(--ink)">{s.t}</p>
                    <p className="mt-1 text-[14px] leading-[1.55] text-(--ink-3)">{s.b}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href={ZIP}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-(--accent) px-6 text-[15px] font-medium text-(--on-accent) transition-transform hover:-translate-y-0.5"
              >
                <Icon name="download" size={15} /> Download for Chrome
              </a>
              <a
                href="https://github.com/mabubakarAR/8x-fathom-rebuild/tree/main/extension"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center rounded-full border border-(--line-strong) px-6 text-[15px] font-medium text-(--ink) transition-colors hover:bg-(--surface)"
              >
                Read the source
              </a>
            </div>
            <p className="mt-4 text-[13px] text-(--ink-faint)">Unpacked install while the Web Store listing is in review. Manifest V3, about 130 lines in total.</p>
          </div>

          <MeetMock />
        </div>
      </div>
    </section>
  );
}

/* A drawn Google Meet call bar, with the one thing the extension adds. */
const MIC = "M8 2.5a2 2 0 0 1 2 2v3.5a2 2 0 1 1-4 0V4.5a2 2 0 0 1 2-2zM4.5 8a3.5 3.5 0 0 0 7 0M8 11.5V14";
const CAM = "M2.5 5.5A1.5 1.5 0 0 1 4 4h5a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 9 12H4a1.5 1.5 0 0 1-1.5-1.5zM10.5 7.2l3-1.7v5l-3-1.7";
const HAND = "M6 8.5V3.8a1 1 0 1 1 2 0v3.7M8 7V3a1 1 0 1 1 2 0v4.5M10 7.5V4a1 1 0 1 1 2 0v5a4 4 0 0 1-4 4h-.5a3.5 3.5 0 0 1-3.2-2.1L3 8.6a1 1 0 0 1 1.7-1L6 9.3";
const CHAT = "M3 4.5A1.5 1.5 0 0 1 4.5 3h7A1.5 1.5 0 0 1 13 4.5v5a1.5 1.5 0 0 1-1.5 1.5H7l-3 2.5V11a1.5 1.5 0 0 1-1-1.4z";
function MeetMock() {
  return (
    <div className="lp-reveal relative">
      <div className="overflow-hidden rounded-[22px] border border-(--line-strong) bg-[oklch(14%_0.006_260)] shadow-[0_30px_80px_oklch(0%_0_0/0.45)]">
        <div className="grid grid-cols-2 gap-2 p-2">
          {["Priya", "Jonas", "Dani", "You"].map((n, i) => (
            <div key={n} className="relative aspect-[4/3] overflow-hidden rounded-[12px] bg-[oklch(22%_0.008_260)]">
              <div
                className="absolute inset-0"
                style={{ background: `radial-gradient(60% 60% at 50% 40%, oklch(${34 + i * 3}% 0.03 ${200 + i * 40} / 0.9), transparent 70%)` }}
              />
              <span className="absolute left-2.5 bottom-2 rounded-md bg-[oklch(0%_0_0/0.45)] px-1.5 py-0.5 text-[11px] text-white/85">{n}</span>
              {i === 1 && <span className="absolute right-2.5 top-2 flex h-5 items-center gap-0.5 rounded-full bg-white/10 px-1.5"><i className="h-2 w-0.5 animate-pulse rounded bg-white/80" /><i className="h-3 w-0.5 animate-pulse rounded bg-white/80 [animation-delay:120ms]" /><i className="h-1.5 w-0.5 animate-pulse rounded bg-white/80 [animation-delay:240ms]" /></span>}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-white/8 px-4 py-3">
          <span className="mono hidden text-[11.5px] text-white/50 sm:inline">14:02 · abc-defg-hij</span>
          <div className="flex items-center gap-2">
            {[MIC, CAM, HAND, CHAT].map((d, i) => (
              <span key={i} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white/80">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
              </span>
            ))}
            <span className="grid h-9 w-11 place-items-center rounded-full bg-[oklch(58%_0.22_25)] text-white">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden><path d="M2.3 6.4c1.5-1.6 3.5-2.4 5.7-2.4s4.2.8 5.7 2.4c.3.3.3.8 0 1.1l-1.4 1.4c-.3.3-.8.3-1.1 0l-1-1c-.3-.3-.4-.7-.3-1.1-.6-.2-1.2-.3-1.9-.3s-1.3.1-1.9.3c.1.4 0 .8-.3 1.1l-1 1c-.3.3-.8.3-1.1 0L2.3 7.5c-.3-.3-.3-.8 0-1.1z" /></svg>
            </span>
          </div>
          <span className="relative inline-flex h-9 items-center gap-2 rounded-full bg-(--accent) pr-3.5 pl-3 text-[13px] font-semibold text-(--on-accent) shadow-[0_0_0_4px_oklch(50%_0.22_266/0.25)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            Record with Noted
          </span>
        </div>
      </div>
      <div className="pointer-events-none absolute -right-3 -bottom-3 hidden rotate-[-2deg] rounded-full border border-(--line-strong) bg-(--surface) px-3 py-1.5 text-[12px] text-(--ink-2) shadow-lg md:block">
        ↑ the only thing the extension adds
      </div>
    </div>
  );
}
