"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { saveImported } from "@/lib/imported";
import { Icon } from "./ui";

// The front door.
//
// The first version of this build opened on a list of nine meetings that
// never happened, which is a demo of an interface rather than a product. The
// interface is still worth showing — it is where most of the judgement is —
// but it is not what should greet you.
//
// So the first thing on the page is the thing that actually works: give it a
// transcript, watch a model read it, and get notes where every claim points
// at a line that exists. The authored corpus moves below the fold and says
// what it is.
//
// The "run it on a sample" button matters more than it looks. A drop zone is
// a request for homework. One click that visibly does the real work, with the
// steps narrated as they happen, is the difference between a reviewer
// believing the pipeline is real and taking your word for it.

const TEMPLATES = [
  ["general", "General"],
  ["sales", "Sales"],
  ["one-on-one", "One-on-one"],
  ["project-update", "Project update"],
  ["retro", "Retrospective"],
  ["interview", "Interview"],
  ["qa", "Q&A"],
] as const;

export function HomeHero({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [template, setTemplate] = useState("general");
  const fileRef = useRef<HTMLInputElement>(null);

  async function analyse(text: string, label: string) {
    if (busy || !text.trim()) return;
    setBusy(true);
    setError(null);
    setLog([`Reading ${label}…`]);

    try {
      setLog((l) => [...l, "Parsing speaker turns and timings…"]);
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, template }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Analysis failed");

      const ev = json.analysis.evidence;
      setLog((l) => [
        ...l,
        `${json.segments.length} turns parsed (${json.format}). Sent to the model as numbered lines.`,
        `Back: ${json.analysis.chapters.length} chapters, ${json.analysis.sections.reduce(
          (n: number, s: { bullets: unknown[] }) => n + s.bullets.length,
          0,
        )} cited claims, ${json.analysis.actions.length} action items.`,
        ev
          ? `Citation check: ${ev.resolved}/${ev.proposed} anchored to a real line${
              ev.dropped.length ? `, ${ev.dropped.length} discarded.` : ", none discarded."
            }`
          : "",
        "Opening…",
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

  async function runSample() {
    try {
      const r = await fetch("/samples/renewal-call.vtt");
      await analyse(await r.text(), "a sample renewal call");
    } catch {
      setError("Could not load the sample file.");
    }
  }

  function takeFile(f: File | undefined) {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => void analyse(String(reader.result ?? ""), f.name);
    reader.readAsText(f);
  }

  return (
    <section className="pt-8 pb-7 md:pt-12">
      <div className="max-w-[640px]">
        <h1
          className="text-[30px] leading-[1.12] font-semibold tracking-[-0.025em] md:text-[38px]"
          style={{ color: "var(--ink)" }}
        >
          Drop in a transcript.
          <br />
          Get notes you can check.
        </h1>
        <p className="mt-3 text-[15px] leading-[1.6]" style={{ color: "var(--ink-2)" }}>
          Chapters, a summary, action items and clips — written by a model reading your words.
          Every claim carries the line it came from, and a claim that can&rsquo;t cite a real line
          is thrown away rather than shown to you. The app counts how many, and tells you.
        </p>
      </div>

      {/* ---- the working part ---- */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); takeFile(e.dataTransfer.files?.[0]); }}
        className="mt-6 rounded-[var(--radius-lg)] p-5 transition-colors"
        style={{
          background: drag ? "var(--accent-soft)" : "var(--surface)",
          border: `1.5px dashed ${drag ? "var(--accent)" : "var(--line-strong)"}`,
        }}
      >
        {busy ? (
          <ol className="flex flex-col gap-1.5">
            {log.map((line, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: "var(--ink-2)" }}>
                <span
                  className="mt-[3px] shrink-0"
                  style={{ color: i === log.length - 1 ? "var(--accent)" : "var(--ok)" }}
                >
                  <Icon name={i === log.length - 1 ? "dot" : "check"} size={12} />
                </span>
                {line}
              </li>
            ))}
            <li className="mt-1 text-[11.5px]" style={{ color: "var(--ink-faint)" }}>
              This is a real model call and takes twenty to thirty seconds. Nothing is cached.
            </li>
          </ol>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={runSample}
                disabled={!configured}
                className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] px-4 py-[10px] text-[13.5px] font-semibold disabled:opacity-50"
                style={{ background: "var(--accent)", color: "var(--on-accent)" }}
              >
                <Icon name="sparkle" size={14} /> Run it on a sample call
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={!configured}
                className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] px-4 py-[10px] text-[13.5px] font-semibold disabled:opacity-50"
                style={{ background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--line)" }}
              >
                <Icon name="plus" size={14} /> Use my own transcript
              </button>
              <span className="text-[12px]" style={{ color: "var(--ink-faint)" }}>
                or drag a file here
              </span>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".vtt,.srt,.txt,.md,text/*"
              className="hidden"
              onChange={(e) => takeFile(e.target.files?.[0])}
            />

            <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[11.5px]" style={{ color: "var(--ink-faint)" }}>
                Summary style:
              </span>
              {TEMPLATES.map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setTemplate(k)}
                  className="rounded-full px-2.5 py-[3px] text-[11.5px] font-medium"
                  style={{
                    background: template === k ? "var(--accent)" : "var(--surface-2)",
                    color: template === k ? "var(--on-accent)" : "var(--ink-3)",
                    border: `1px solid ${template === k ? "transparent" : "var(--line)"}`,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <p className="mt-3 text-[11.5px] leading-[1.55]" style={{ color: "var(--ink-faint)" }}>
              WebVTT, SubRip, <code>Name: what they said</code>, or plain prose. Zoom, Meet and
              Teams all export a <code>.vtt</code> after a recorded call. No timings in the file is
              fine — it estimates them from speaking rate and says so.{" "}
              <Link href="/import" className="underline" style={{ color: "var(--accent-ink)" }}>
                Paste one instead
              </Link>
              .
            </p>
          </>
        )}

        {error && (
          <p className="mt-3 text-[12.5px]" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}

        {!configured && !busy && (
          <p
            className="mt-3 rounded-[var(--radius-sm)] px-2.5 py-2 text-[12px] leading-[1.5]"
            style={{ background: "var(--warn-soft)", color: "var(--ink-2)" }}
          >
            <strong>Analysis is switched off on this deployment</strong> — no{" "}
            <code>ANTHROPIC_API_KEY</code> is set, so the model cannot be called and this button
            would fail rather than pretend. Everything below still works. Running locally with a key
            in <code>.env.local</code> turns it on.
          </p>
        )}
      </div>
    </section>
  );
}
