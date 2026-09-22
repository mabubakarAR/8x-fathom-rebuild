"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { saveImported, listImported, deleteImported } from "@/lib/imported";
import { Badge, Icon } from "./ui";
import { PageHeader } from "./page-header";
import Link from "next/link";

// Bring your own transcript.
//
// The honest framing, which is also what the page says: this build cannot
// transcribe audio, because the environment it was built in cannot reach a
// speech API. What it can do — and what was missing from the first version —
// is generate the chapters, summary, action items and clips with a real model
// reading a real transcript, and refuse to show a citation it cannot resolve.
//
// So you bring the transcript. Every meeting tool exports one.

const TEMPLATES = [
  ["general", "General"],
  ["sales", "Sales"],
  ["one-on-one", "One-on-one"],
  ["project-update", "Project update"],
  ["retro", "Retrospective"],
  ["interview", "Interview"],
  ["qa", "Q&A"],
] as const;

const SAMPLE = `WEBVTT

00:00:00.000 --> 00:00:09.400
<v Priya>Right, let's start. We've got thirty minutes and three things to get through, and I'd rather do two of them properly than all three badly.

00:00:09.900 --> 00:00:21.200
<v Marcus>Agreed. Can I put the migration first? It's the one with a date attached and the other two aren't blocked by anything.

00:00:21.600 --> 00:00:34.800
<v Priya>Go ahead. Where are we?

00:00:35.100 --> 00:00:58.300
<v Marcus>Staging is done and it's been stable for nine days. Production is the question. The window I want is Saturday the fourth, starting at 6am, because that's our lowest traffic and it gives us the whole weekend to roll back if it goes wrong.

00:00:58.700 --> 00:01:12.500
<v Dani>My worry is that the fourth is the same weekend as the Brightwater onboarding. If the migration goes badly, we're breaking a brand new customer's first week.

00:01:12.900 --> 00:01:24.100
<v Marcus>That's a good catch and I hadn't linked them. Do you know when their onboarding actually starts?

00:01:24.400 --> 00:01:33.000
<v Dani>Monday the sixth. So there's no overlap technically, but there's no buffer either.

00:01:33.400 --> 00:01:49.700
<v Priya>Then let's move it a week. Saturday the eleventh. Marcus, does a week cost us anything?

00:01:50.100 --> 00:02:02.800
<v Marcus>It costs me nothing except patience. I'd rather have the buffer than the argument afterwards.

00:02:03.200 --> 00:02:14.600
<v Priya>Decided — the eleventh. Marcus writes the rollback plan by Wednesday and Dani reviews it before it goes out.`;

export function ImportFlow({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [template, setTemplate] = useState("general");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  // Empty on the server AND on the client's first render, then filled after
  // mount. A lazy initialiser reading localStorage renders [] on the server
  // and the real list on the client, which is a hydration mismatch every time
  // the visitor has imported anything.
  const [existing, setExisting] = useState<ReturnType<typeof listImported>>([]);
  useEffect(() => setExisting(listImported()), []);
  const fileRef = useRef<HTMLInputElement>(null);

  async function run() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    setLog(["Parsing transcript…"]);

    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, template }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Analysis failed");

      setLog((l) => [
        ...l,
        `${json.segments.length} speaker turns parsed (${json.format}).`,
        `Claude returned ${json.analysis.chapters.length} chapters, ${json.analysis.sections.reduce(
          (n: number, s: { bullets: unknown[] }) => n + s.bullets.length,
          0,
        )} cited bullets, ${json.analysis.actions.length} action items.`,
        json.analysis.evidence
          ? `Citation check: ${json.analysis.evidence.resolved} of ${json.analysis.evidence.proposed} claims anchored to a real line` +
            (json.analysis.evidence.dropped.length
              ? `, ${json.analysis.evidence.dropped.length} discarded.`
              : ", none discarded.")
          : "",
      ].filter(Boolean));

      const id = `imp-${Date.now().toString(36)}`;
      saveImported({
        id,
        createdAt: new Date().toISOString(),
        templateKey: template,
        format: json.format,
        warnings: json.warnings ?? [],
        segments: json.segments,
        speakerNames: json.speakerNames ?? {},
        analysis: json.analysis,
      });
      router.push(`/imported/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[820px] px-4 pb-24 md:px-8">
      <PageHeader
        title="Import a transcript"
        subtitle="Drop in a VTT, SRT or plain transcript and a real model reads it — chapters, summary, action items and clips, every claim cited back to a line that exists."
      />

      {!configured && (
        <div
          className="mb-4 rounded-[var(--radius-lg)] p-3.5 text-[13px]"
          style={{ background: "var(--warn-soft)", border: "1px solid var(--warn)", color: "var(--ink-2)" }}
        >
          <strong style={{ color: "var(--warn)" }}>Not configured.</strong>{" "}
          <code>ANTHROPIC_API_KEY</code> is not set on the server, so analysis will fail. Set it in
          the deployment&rsquo;s environment variables and redeploy.
        </div>
      )}

      <div
        className="mb-3 rounded-[var(--radius-lg)] p-3.5 text-[12.5px] leading-relaxed"
        style={{ background: "var(--surface-2)", color: "var(--ink-2)" }}
      >
        <strong>Where to get one:</strong> Zoom, Meet and Teams all export a <code>.vtt</code> after
        a recorded call. Otter and Whisper export <code>.srt</code>. Or paste plain lines in the
        form <code>Name: what they said</code> — timings are then estimated from speaking rate, and
        the page says so.
        <br />
        <strong>Haven&rsquo;t got one to hand?</strong> There are two in{" "}
        <code>public/samples/</code> in the repository — one clean six-speaker call, and one with no
        timestamps and no speaker labels at all, to see what the pipeline does when the file gives
        it nothing.
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste a transcript, or use the file button below…"
        rows={12}
        spellCheck={false}
        className="scroll-thin w-full rounded-[var(--radius-lg)] p-3.5 font-mono text-[12.5px] leading-[1.6] outline-none"
        style={{ background: "var(--surface)", border: "1px solid var(--line)", color: "var(--ink-2)" }}
      />

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".vtt,.srt,.txt,.md,text/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) setText(await f.text());
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-[var(--radius-sm)] px-3 py-[7px] text-[12.5px] font-medium"
          style={{ background: "var(--surface)", color: "var(--ink-2)", border: "1px solid var(--line)" }}
        >
          Choose a file
        </button>
        <button
          onClick={() => setText(SAMPLE)}
          className="rounded-[var(--radius-sm)] px-3 py-[7px] text-[12.5px] font-medium"
          style={{ background: "var(--surface)", color: "var(--ink-2)", border: "1px solid var(--line)" }}
        >
          Use a sample
        </button>

        <select
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          className="rounded-[var(--radius-sm)] px-2 py-[6px] text-[12.5px]"
          style={{ background: "var(--surface)", color: "var(--ink-2)", border: "1px solid var(--line)" }}
        >
          {TEMPLATES.map(([k, l]) => (
            <option key={k} value={k}>{l}</option>
          ))}
        </select>

        <button
          onClick={run}
          disabled={!text.trim() || busy}
          className="ml-auto rounded-[var(--radius-sm)] px-4 py-[8px] text-[13px] font-semibold disabled:opacity-40"
          style={{ background: "var(--accent)", color: "var(--on-accent)" }}
        >
          {busy ? "Analysing…" : "Analyse with Claude"}
        </button>
      </div>

      {(log.length > 0 || error) && (
        <div
          className="mt-4 rounded-[var(--radius-lg)] p-3.5"
          style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
        >
          <ul className="flex flex-col gap-1 font-mono text-[12px]" style={{ color: "var(--ink-2)" }}>
            {log.map((l, i) => (
              <li key={i} className="fade-up">
                <span style={{ color: "var(--ok)" }}>✓</span> {l}
              </li>
            ))}
            {busy && (
              <li style={{ color: "var(--ink-faint)" }}>
                <span className="live-dot">●</span> reading the transcript…
              </li>
            )}
          </ul>
          {error && (
            <div
              className="mt-2.5 rounded-[var(--radius)] p-2.5 font-mono text-[12px]"
              style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
            >
              {error}
            </div>
          )}
        </div>
      )}

      {existing.length > 0 && (
        <section className="mt-8">
          <h2
            className="mb-2 text-[11px] font-semibold tracking-[0.07em] uppercase"
            style={{ color: "var(--ink-3)" }}
          >
            Imported on this browser
          </h2>
          <div className="flex flex-col gap-1.5">
            {existing.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-[var(--radius)] p-3"
                style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
              >
                <Link href={`/imported/${m.id}`} className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold" style={{ color: "var(--ink)" }}>
                    {m.analysis.title}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11.5px]" style={{ color: "var(--ink-faint)" }}>
                    <Badge tone="ok">Real analysis</Badge>
                    <span className="tnum">{m.segments.length} lines · {m.format}</span>
                  </div>
                </Link>
                <button
                  onClick={() => {
                    deleteImported(m.id);
                    setExisting(listImported());
                  }}
                  aria-label="Delete"
                  style={{ color: "var(--ink-3)" }}
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="mt-6 text-[12px] leading-relaxed" style={{ color: "var(--ink-faint)" }}>
        Stated plainly: this build does not transcribe audio — the environment it was written in
        could not reach a speech API, so bringing a transcript is the honest version of that step.
        Everything after it is real. The analysis is Claude reading your words, and any citation it
        produces that does not resolve to an actual line is dropped before you see it — and the
        Evidence tab on the result shows you exactly how many were, and what they said. The result
        is kept in this browser, not a database.
      </p>
    </div>
  );
}
