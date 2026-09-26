"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useOverlay } from "@/lib/overlay";
import type { UserSettings } from "@/lib/db/settings";
import { SampleControls } from "./sample-controls";

type Patch = Partial<Pick<UserSettings, "autoRecord" | "defaultTemplate" | "autoShare">>;

export function SettingsForm({
  initial,
  templates,
  user,
  connectCalendar,
  signOut,
}: {
  initial: UserSettings | null;
  templates: { key: string; label: string }[];
  user: { name: string; email: string; image: string | null };
  connectCalendar: React.ReactNode;
  signOut: React.ReactNode;
}) {
  const router = useRouter();
  const { state, setTheme } = useOverlay();
  const [s, setS] = useState<UserSettings>(
    initial ?? { autoRecord: "all", defaultTemplate: "general", autoShare: false, calendarConnected: false, createdAt: "", meetings: 0, recordings: 0 },
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save(patch: Patch) {
    setS((v) => ({ ...v, ...patch }));
    setSaving("Saving…");
    const r = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    setSaving(r.ok ? "Saved" : "Not saved");
    setTimeout(() => setSaving(null), 1200);
  }

  async function action(name: "disconnectCalendar" | "deleteAllData") {
    setSaving("Working…");
    await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: name }) });
    setSaving(null);
    setConfirmDelete(false);
    router.refresh();
  }

  const Seg = <T extends string>({ value, options, onPick }: { value: T; options: { key: T; label: string; hint?: string }[]; onPick: (k: T) => void }) => (
    <div className="inline-flex rounded-full p-[3px]" style={{ background: "var(--surface-2)" }}>
      {options.map((o) => (
        <button key={o.key} onClick={() => onPick(o.key)} title={o.hint} className="rounded-full px-3 py-[6px] text-[13px] font-medium transition-colors" style={{ background: value === o.key ? "var(--surface)" : "transparent", color: value === o.key ? "var(--ink)" : "var(--ink-3)", boxShadow: value === o.key ? "var(--shadow-sm)" : undefined }}>
          {o.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      {/* ---- the sentence ---- */}
      <section className="raised rounded-[var(--radius-lg)] p-5 md:p-6" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-3 text-[16px] leading-[2.4]" style={{ color: "var(--ink-2)" }}>
          <span>Record</span>
          <Seg
            value={s.autoRecord}
            onPick={(k) => save({ autoRecord: k })}
            options={[
              { key: "all", label: "every meeting", hint: "Anything on the calendar with a video link" },
              { key: "external", label: "external only", hint: "Only meetings with guests from outside your domain" },
              { key: "none", label: "nothing automatically", hint: "You press Record each time" },
            ]}
          />
          <span>with the</span>
          <select
            value={s.defaultTemplate}
            onChange={(e) => save({ defaultTemplate: e.target.value })}
            className="h-[34px] w-[170px] appearance-none rounded-full pr-7 pl-3.5 text-[13px] font-medium outline-none"
            style={{ background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--line)" }}
          >
            {templates.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <span>template, and</span>
          <Seg
            value={s.autoShare ? "yes" : "no"}
            onPick={(k) => save({ autoShare: k === "yes" })}
            options={[
              { key: "no", label: "keep notes to myself" },
              { key: "yes", label: "share with attendees" },
            ]}
          />
          <span>.</span>
        </div>
        <p className="mt-3 text-[12.5px]" style={{ color: "var(--ink-faint)" }}>
          The recording rule is applied to your calendar before each meeting and shown next to it, so it can be overridden while there is still time. {saving && <span style={{ color: "var(--ink-3)" }}>· {saving}</span>}
        </p>
      </section>

      {/* ---- calendar ---- */}
      <Row title="Google Calendar" body={s.calendarConnected ? "Connected. The next seven days are read when you open the home page; nothing is stored." : "Not connected. Connect to see upcoming meetings with a one-click join."}>
        <div className="flex items-center gap-2">
          {connectCalendar}
          {s.calendarConnected && (
            <button onClick={() => action("disconnectCalendar")} className="rounded-full px-3.5 py-[8px] text-[13px] font-medium" style={{ color: "var(--ink-2)", border: "1px solid var(--line-strong)" }}>
              Disconnect
            </button>
          )}
        </div>
      </Row>

      {/* ---- appearance ---- */}
      <Row title="Appearance" body="Light matches the front page. Dark is the same product with the lights off.">
        <Seg
          value={state.theme}
          onPick={(k) => setTheme(k)}
          options={[
            { key: "light", label: "Light" },
            { key: "dark", label: "Dark" },
            { key: "system", label: "System" },
          ]}
        />
      </Row>

      {/* ---- sample ---- */}
      <Row title="Sample workspace" body="Nine authored meetings from one team's quarter, so there is something to search and ask before you have recorded anything. Removable at any time; your own recordings are untouched.">
        <SampleControls variant={s.meetings > s.recordings ? "remove" : "import"} />
      </Row>

      {/* ---- account ---- */}
      <Row title="Account" body={`${user.email} · ${s.recordings} ${s.recordings === 1 ? "recording" : "recordings"} of your own${s.createdAt ? ` · since ${new Date(s.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}` : ""}`}>
        {signOut}
      </Row>

      {/* ---- danger ---- */}
      <Row title="Delete everything" body="Removes every meeting, transcript, note and recording in your account. Your sign-in stays. There is no undo.">
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} className="rounded-full px-3.5 py-[8px] text-[13px] font-medium" style={{ color: "var(--danger)", border: "1px solid var(--danger)" }}>
            Delete all my data
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => action("deleteAllData")} className="rounded-full px-3.5 py-[8px] text-[13px] font-semibold" style={{ background: "var(--danger)", color: "#fff" }}>
              Yes, delete {s.meetings} {s.meetings === 1 ? "meeting" : "meetings"}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="text-[13px]" style={{ color: "var(--ink-3)" }}>Cancel</button>
          </div>
        )}
      </Row>
    </div>
  );
}

function Row({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-4 py-1" style={{ borderTop: "1px solid var(--line)", paddingTop: "1.25rem" }}>
      <div className="min-w-0 max-w-[52ch]">
        <h2 className="text-[14.5px] font-semibold" style={{ color: "var(--ink)" }}>{title}</h2>
        <p className="mt-1 text-[13px] leading-[1.5]" style={{ color: "var(--ink-3)" }}>{body}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </section>
  );
}
