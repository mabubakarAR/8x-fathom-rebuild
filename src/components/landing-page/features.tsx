import { Icon } from "../ui";

const sp = (n: number) => `var(--sp-${n})`;

function Card({ className = "", label, title, body, children }: { className?: string; label: string; title: string; body: string; children?: React.ReactNode }) {
  return (
    <article className={`lp-card lp-reveal flex flex-col p-6 md:p-8 ${className}`}>
      <p className="mono text-[12px] text-(--ink-3)">{label}</p>
      <h3 className="mt-3 text-[22px] leading-[1.2] font-semibold tracking-[-0.025em] text-balance text-(--ink) md:text-[24px]">{title}</h3>
      <p className="mt-2 max-w-[46ch] text-[15px] leading-[1.6] text-(--ink-3)">{body}</p>
      {children && <div className="mt-8 flex-1">{children}</div>}
    </article>
  );
}

export function Features() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      <Card
        className="md:col-span-2"
        label="Speaker repair"
        title="Fix a voice once. It fixes everywhere."
        body="Reassign one misattributed line and every other turn from that voice follows — one correction, not two hundred."
      >
        <div className="rounded-[14px] border border-(--line) bg-(--bg) p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-(--line-strong) px-3 py-1.5 text-[13px] text-(--ink-faint) line-through decoration-1">
              <span className="h-2 w-2 rounded-full bg-(--ink-faint)" /> Speaker 6
            </span>
            <svg width="28" height="10" viewBox="0 0 28 10" className="text-(--ink-faint)" aria-hidden><path d="M0 5h25m-4-4 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
            <span className="inline-flex items-center gap-2 rounded-full bg-(--surface) px-3 py-1.5 text-[13px] font-semibold shadow-sm ring-1 ring-(--line)" style={{ color: sp(6) }}>
              <span className="h-2 w-2 rounded-full" style={{ background: sp(6) }} /> Leah Ortiz
            </span>
            <span className="mono ml-auto text-[12px] text-(--ok)">214 turns updated</span>
          </div>
          <div className="mt-5 flex h-10 items-end gap-[3px]" aria-hidden>
            {Array.from({ length: 64 }, (_, i) => {
              const n = [0, 1, 6, 2, 6, 4, 3, 6, 5, 7][i % 10];
              const h = 25 + ((i * 37) % 70);
              return <span key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: sp(n), opacity: n === 6 ? 1 : 0.18 }} />;
            })}
          </div>
        </div>
      </Card>

      <Card label="Export" title="Your transcript, in any format." body="Timestamps and speakers intact, ready for your next tool.">
        <div className="grid grid-cols-2 gap-2">
          {[".md", ".vtt", ".srt", ".json"].map((f) => (
            <div key={f} className="mono flex items-center justify-between rounded-[10px] border border-(--line) bg-(--bg) px-3 py-2.5 text-[13px] text-(--ink-2)">
              {f}
              <span className="text-(--ink-faint)"><Icon name="download" size={13} /></span>
            </div>
          ))}
        </div>
      </Card>

      <Card label="Calendar" title="Decides before the call does." body="Your week, with a recording rule already applied to each meeting — and stated, so you can override it.">
        <ul className="flex flex-col divide-y divide-(--line) rounded-[12px] border border-(--line) bg-(--bg) text-[13.5px]">
          {[
            { t: "Brightwater renewal", r: "Record", on: true },
            { t: "1:1 with Sam", r: "Skip", on: false },
            { t: "Weekly product sync", r: "Record", on: true },
          ].map((m) => (
            <li key={m.t} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
              <span className="truncate text-(--ink-2)">{m.t}</span>
              <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${m.on ? "bg-(--accent-soft) text-(--accent-ink)" : "text-(--ink-faint)"}`}>{m.r}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card label="Google Meet" title="A Record button, inside the call." body="The Chrome extension opens the recorder already knowing which meeting you're in.">
        <a
          href="#extension"
          className="inline-flex items-center gap-2 rounded-full bg-(--ink) px-4 py-2.5 text-[13.5px] font-medium text-(--bg) transition-transform hover:-translate-y-0.5"
        >
          <Icon name="download" size={13} /> See the extension
        </a>
      </Card>

      <Card label="Privacy" title="Nothing records until you say so." body="No auto-join, no surprise bot. You press record, the browser asks, everyone sees it.">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-(--accent-soft) text-(--accent-ink)">
            <Icon name="shield" size={18} />
          </span>
          <span className="text-[14px] text-(--ink-3)">Consent is the share dialog.</span>
        </div>
      </Card>
    </div>
  );
}
