import { Icon } from "../ui";

const sp = (n: number) => `var(--sp-${n})`;

function Card({ className = "", eyebrow, title, body, children }: { className?: string; eyebrow: string; title: React.ReactNode; body: string; children?: React.ReactNode }) {
  return (
    <article className={`lp-card lp-reveal flex flex-col p-6 md:p-7 ${className}`}>
      <div className="text-[11px] font-semibold tracking-[0.14em] uppercase" style={{ color: "var(--accent)" }}>{eyebrow}</div>
      <h3 className="display mt-2 text-[28px] leading-[1.08] text-balance md:text-[32px]">{title}</h3>
      <p className="mt-2 max-w-[44ch] text-[14px] leading-[1.6]" style={{ color: "var(--ink-3)" }}>{body}</p>
      {children && <div className="mt-6 flex-1">{children}</div>}
    </article>
  );
}

export function Features() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card
        className="md:col-span-2"
        eyebrow="Speaker repair"
        title={<>Fix a voice once. <em>It fixes everywhere.</em></>}
        body="Reassign one misattributed line and every other turn from that voice follows — one correction, not two hundred."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] line-through decoration-1" style={{ background: "oklch(100% 0 0 / 0.04)", border: "1px dashed var(--line-strong)", color: "var(--ink-faint)" }}>
            <span className="h-2 w-2 rounded-full" style={{ background: "var(--ink-faint)" }} /> Speaker 6
          </div>
          <span className="hidden sm:block" style={{ color: "var(--accent)" }} aria-hidden>
            <svg width="40" height="12" viewBox="0 0 40 12"><path d="M0 6h36m-5-5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
          </span>
          <div className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-semibold" style={{ background: "oklch(79% 0.145 115 / 0.14)", color: sp(6) }}>
            <span className="h-2 w-2 rounded-full" style={{ background: sp(6) }} /> Leah Ortiz
          </div>
          <span className="text-[12.5px] tnum sm:ml-auto" style={{ color: "var(--ok)" }}>214 turns updated</span>
        </div>
        <div className="mt-5 flex h-8 items-end gap-[3px]" aria-hidden>
          {Array.from({ length: 56 }, (_, i) => {
            const n = [0, 1, 6, 2, 6, 4, 3, 6, 5, 7][i % 10];
            const h = 25 + ((i * 37) % 70);
            return <span key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: sp(n), opacity: n === 6 ? 1 : 0.28 }} />;
          })}
        </div>
      </Card>

      <Card eyebrow="Export" title={<>Your transcript, <em>not</em> a clipboard.</>} body="Download the whole thing, timestamps intact, in the format your next tool expects.">
        <div className="grid grid-cols-2 gap-2">
          {[".md", ".vtt", ".srt", ".json"].map((f) => (
            <div key={f} className="flex items-center justify-between rounded-[10px] px-3 py-2.5 font-mono text-[13px]" style={{ background: "oklch(100% 0 0 / 0.04)", border: "1px solid var(--line)", color: "var(--ink-2)" }}>
              {f}
              <span style={{ color: "var(--ink-faint)" }}><Icon name="download" size={13} /></span>
            </div>
          ))}
        </div>
      </Card>

      <Card eyebrow="Calendar" title="Decides before the call does." body="Your next seven days, each with a recording rule already applied — and stated, so you can override it.">
        <ul className="flex flex-col gap-2 text-[13px]">
          {[
            { t: "Brightwater renewal", r: "Record · external guests", on: true },
            { t: "1:1 with Sam", r: "Skip · two-person", on: false },
            { t: "Weekly product sync", r: "Record · recurring", on: true },
          ].map((m) => (
            <li key={m.t} className="flex items-center justify-between gap-3 rounded-[10px] px-3 py-2" style={{ background: "oklch(100% 0 0 / 0.035)" }}>
              <span className="truncate" style={{ color: "var(--ink-2)" }}>{m.t}</span>
              <span className="shrink-0 text-[11px] font-semibold" style={{ color: m.on ? "var(--accent)" : "var(--ink-faint)" }}>{m.r}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card eyebrow="Google Meet" title="A Record button, inside the call." body="The Chrome extension opens the recorder already knowing which meeting you're in.">
        <a href="/extension/fathom-rebuild-extension.zip" className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors hover:bg-white/10" style={{ border: "1px solid var(--line-strong)", color: "var(--ink)" }}>
          <Icon name="download" size={13} /> Download the extension
        </a>
      </Card>

      <Card eyebrow="Privacy" title="Nothing records until you say so." body="No auto-join, no surprise bot. You press record, the browser asks, everyone sees it.">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
            <Icon name="shield" size={18} />
          </span>
          <span className="text-[13px]" style={{ color: "var(--ink-3)" }}>Consent is the share dialog.</span>
        </div>
      </Card>
    </div>
  );
}
