import Link from "next/link";
import type { UpcomingMeeting } from "@/lib/google/calendar";
import { SampleControls } from "./sample-controls";
import { Icon } from "./ui";

// The top of the home page.
//
// One line that says where you are and what is open, one card for the next
// thing that will happen, and the three ways to get a meeting in. The
// previous version was three buttons, a calendar line and a banner stacked
// on top of each other — a settings page pretending to be a home page.

export function WorkspaceHero({
  name,
  empty,
  meetings,
  minutes,
  openActions,
  next,
  connectCalendar,
  calendarConnected,
}: {
  name: string;
  empty: boolean;
  meetings: number;
  minutes: number;
  openActions: number;
  next: UpcomingMeeting | null;
  connectCalendar?: React.ReactNode;
  calendarConnected: boolean;
}) {
  const first = name.split(" ")[0] || "there";
  const hour = new Date().getUTCHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <header className="mb-6 pt-8 md:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[30px] leading-[1.05] md:text-[38px]" style={{ color: "var(--ink)" }}>
            {greeting}, {first}.
          </h1>
          <p className="mt-2 text-[14px]" style={{ color: "var(--ink-3)" }}>
            {empty ? (
              "Nothing recorded yet."
            ) : (
              <>
                <b className="tnum" style={{ color: "var(--ink)" }}>{meetings}</b> {meetings === 1 ? "meeting" : "meetings"} ·{" "}
                <b className="tnum" style={{ color: "var(--ink)" }}>{minutes}</b> min ·{" "}
                <b className="tnum" style={{ color: openActions ? "var(--warn-ink)" : "var(--ink)" }}>{openActions}</b> open {openActions === 1 ? "action" : "actions"}
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/record" className="inline-flex items-center gap-2 rounded-full px-4 py-[10px] text-[13.5px] font-semibold transition-transform hover:scale-[1.02]" style={{ background: "var(--danger)", color: "#fff", boxShadow: "0 6px 20px color-mix(in oklab, var(--danger) 30%, transparent)" }}>
            <span className="block h-2.5 w-2.5 rounded-full" style={{ background: "currentColor" }} />
            Record
          </Link>
          <Link href="/import" className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-[10px] text-[13.5px] font-medium" style={{ color: "var(--ink-2)", border: "1px solid var(--line-strong)" }}>
            <Icon name="plus" size={13} /> Transcript
          </Link>
          <Link href="/upload" className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-[10px] text-[13.5px] font-medium" style={{ color: "var(--ink-2)", border: "1px solid var(--line)" }}>
            <Icon name="download" size={13} /> Recording
          </Link>
        </div>
      </div>

      {/* ---- next up ---- */}
      <div className="mt-6 grid gap-3 md:grid-cols-[1.4fr_1fr]">
        <NextUp next={next} connected={calendarConnected} connect={connectCalendar} />
        {empty ? (
          <div className="raised flex flex-col justify-between rounded-[var(--radius-lg)] p-5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
            <div>
              <div className="text-[11px] font-semibold tracking-[0.08em] uppercase" style={{ color: "var(--ink-faint)" }}>Start with something</div>
              <p className="mt-1.5 text-[13.5px] leading-[1.5]" style={{ color: "var(--ink-2)" }}>
                Nine authored meetings from one team&rsquo;s quarter — enough to search across, ask questions of, and catch a decision that got reversed. Imports into your account; removable in one click.
              </p>
            </div>
            <div className="mt-4"><SampleControls variant="import" /></div>
          </div>
        ) : (
          <div className="raised rounded-[var(--radius-lg)] p-5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
            <div className="text-[11px] font-semibold tracking-[0.08em] uppercase" style={{ color: "var(--ink-faint)" }}>Ask your meetings</div>
            <p className="mt-1.5 text-[13.5px] leading-[1.5]" style={{ color: "var(--ink-2)" }}>
              One question, answered from every call, each claim tied to the meeting, the speaker and the second.
            </p>
            <p className="mt-3 text-[12px]" style={{ color: "var(--ink-faint)" }}>
              Press <kbd className="rounded px-1.5 py-[1px] text-[11px]" style={{ background: "var(--surface-2)", color: "var(--ink-2)" }}>?</kbd> anywhere, or the Ask button in the sidebar.
            </p>
          </div>
        )}
      </div>
    </header>
  );
}

function relative(mins: number): string {
  if (mins < 1) return "now";
  if (mins < 60) return `in ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `in ${h} ${h === 1 ? "hour" : "hours"}`;
  const d = Math.round(h / 24);
  return d === 1 ? "tomorrow" : `in ${d} days`;
}

function NextUp({ next, connected, connect }: { next: UpcomingMeeting | null; connected: boolean; connect?: React.ReactNode }) {
  if (!connected) {
    return (
      <div className="flex flex-col justify-between rounded-[var(--radius-lg)] p-5" style={{ background: "var(--surface)", border: "1px dashed var(--line-strong)" }}>
        <div>
          <div className="text-[11px] font-semibold tracking-[0.08em] uppercase" style={{ color: "var(--ink-faint)" }}>Next up</div>
          <p className="mt-1.5 text-[13.5px] leading-[1.5]" style={{ color: "var(--ink-2)" }}>
            Connect Google Calendar and your next meeting appears here with a recording decision already made and a one-click join.
          </p>
          <p className="mt-1 text-[11.5px]" style={{ color: "var(--ink-faint)" }}>Read-only. Google shows an &ldquo;unverified app&rdquo; screen because this is a take-home — Advanced → continue.</p>
        </div>
        <div className="mt-4">{connect}</div>
      </div>
    );
  }
  if (!next) {
    return (
      <div className="rounded-[var(--radius-lg)] p-5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
        <div className="text-[11px] font-semibold tracking-[0.08em] uppercase" style={{ color: "var(--ink-faint)" }}>Next up</div>
        <p className="mt-1.5 text-[13.5px] leading-[1.5]" style={{ color: "var(--ink-2)" }}>Nothing with a video link in the next seven days.</p>
        <p className="mt-1 text-[12px]" style={{ color: "var(--ink-faint)" }}>Put a Google Meet on your calendar and it appears here.</p>
      </div>
    );
  }
  const soon = next.startsInMinutes <= 15;
  const guests = next.attendees.filter((a) => a.external).length;
  return (
    <div className="raised flex flex-col justify-between rounded-[var(--radius-lg)] p-5" style={{ background: "var(--surface)", border: `1px solid ${soon ? "var(--accent-line)" : "var(--line)"}` }}>
      <div>
        <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.08em] uppercase" style={{ color: soon ? "var(--accent-ink)" : "var(--ink-faint)" }}>
          Next up · <span className="tnum normal-case tracking-normal">{relative(next.startsInMinutes)}</span>
        </div>
        <h2 className="mt-1.5 text-[18px] font-semibold leading-[1.25]" style={{ color: "var(--ink)" }}>{next.title}</h2>
        <p className="mt-1 text-[12.5px]" style={{ color: "var(--ink-3)" }}>
          {next.durationMin} min · {next.platform === "unknown" ? "no link" : next.platform}
          {next.attendees.length > 1 ? ` · ${next.attendees.length} people` : ""}
          {guests ? ` · ${guests} external` : ""}
        </p>
        <p className="mt-2 text-[12px]" style={{ color: "var(--ink-faint)" }}>
          Will record: <b style={{ color: "var(--ink-2)" }}>{next.defaultCapture === "off" ? "no" : next.defaultCapture}</b> — {next.reason.toLowerCase()}.
        </p>
      </div>
      {next.joinUrl && next.defaultCapture !== "off" && (
        <Link
          href={`/record?join=${encodeURIComponent(next.joinUrl)}&title=${encodeURIComponent(next.title)}&mode=${next.defaultCapture}`}
          className="mt-4 inline-flex items-center gap-2 self-start rounded-full px-4 py-[9px] text-[13px] font-semibold"
          style={{ background: soon ? "var(--danger)" : "var(--ink)", color: soon ? "#fff" : "var(--bg)" }}
        >
          <span className="block h-2 w-2 rounded-full" style={{ background: "currentColor" }} />
          Join &amp; record
        </Link>
      )}
    </div>
  );
}
