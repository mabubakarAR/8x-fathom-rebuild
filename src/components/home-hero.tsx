"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { saveImported } from "@/lib/imported";
import { Icon } from "./ui";
import { TemplateSelect } from "./template-select";
import { VoicePrint, type Lane } from "./voice-print";
import { Theatre } from "./theatre";

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

export function HomeHero({ configured, lanes }: { configured: boolean; lanes: Lane[] }) {
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
    <section className="pt-5 pb-6">
      {/* ---- the stage ---- */}
      <div
        className="edge-glow relative overflow-hidden rounded-[var(--radius-xl)]"
        style={{
          background: "var(--bg-sunken)",
          border: "1px solid var(--line)",
          boxShadow: "var(--lift), var(--shadow-lg)",
        }}
      >
        {/* Ambient light source. A large dark panel with no gradient in it
            reads as a flat rectangle; one soft off-centre glow is what makes
            it read as a lit surface. */}
        <div
          className="pointer-events-none absolute -top-1/3 -right-[10%] h-[140%] w-[70%]"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in oklab, var(--accent) 22%, transparent), transparent)",
            // No blur filter here. A radial gradient is already soft, and a
            // CSS blur on an element this large (140% x 70%) makes the
            // browser rasterize and blur it again whenever it scrolls
            // through the viewport, for no visible difference.
          }}
        />
        <VoicePrint
          lanes={lanes}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
        {/* Legibility scrim. The artwork lives behind the words, not in a
            fight with them. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(98deg, var(--bg-sunken) 0%, color-mix(in oklab, var(--bg-sunken) 88%, transparent) 38%, color-mix(in oklab, var(--bg-sunken) 20%, transparent) 62%, transparent 82%)",
          }}
        />

        <div className="relative grid gap-8 px-6 py-10 md:grid-cols-[minmax(0,1fr)_minmax(0,480px)] md:items-center md:gap-10 md:px-10 md:py-11">
          <div className="rise max-w-[600px]">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-[4px] text-[11px] font-semibold tracking-[0.04em] uppercase"
              style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
            >
              <Icon name="shield" size={11} /> Verified meeting notes
            </span>

            <h1
              className="display mt-4 text-[32px] leading-[1.02] md:text-[40px] lg:text-[44px]"
              style={{ color: "var(--ink)" }}
            >
              <span className="block">Every AI notetaker</span>
              <span className="block">sounds confident.</span>
              <span className="block" style={{ color: "var(--accent)" }}>
                This one proves it.
              </span>
            </h1>

            <p
              className="mt-3.5 max-w-[46ch] text-[14px] leading-[1.58] md:text-[15px]"
              style={{ color: "var(--ink-2)" }}
            >
              Hit record and it transcribes you as you talk. Then every sentence of the notes has
              to cite the line it came from, that citation gets checked against the transcript, and{" "}
              <strong style={{ color: "var(--ink)" }}>
                anything that fails is deleted instead of shown to you
              </strong>
              . You see the count every time.
            </p>

            <p className="mt-3 hidden text-[11.5px] leading-[1.5] lg:block" style={{ color: "var(--ink-faint)" }}>
              Behind all of it, the real speaker lanes from the 54-minute eight-person call below.
              Amber is genuine crosstalk.
            </p>
          </div>

          <div className="rise" style={{ animationDelay: "120ms" }}>
            <Theatre />
          </div>
        </div>
      </div>

      {/* ---- the working part ---- */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); takeFile(e.dataTransfer.files?.[0]); }}
        className="rise relative z-10 mx-auto -mt-8 max-w-[980px] rounded-[var(--radius-lg)] p-5 transition-[background,border-color] duration-300"
        style={{
          animationDelay: "220ms",
          background: drag ? "var(--accent-soft)" : "var(--surface)",
          border: `1.5px ${drag ? "solid" : "solid"} ${drag ? "var(--accent)" : "var(--line)"}`,
          boxShadow: "var(--lift), var(--shadow-lg)",
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
              <Link
                href="/record"
                className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] px-4 py-[11px] text-[13.5px] font-semibold transition-transform hover:scale-[1.02]"
                style={{ background: "var(--danger)", color: "oklch(100% 0 0)", boxShadow: "0 6px 26px color-mix(in oklab, var(--danger) 34%, transparent)" }}
              >
                <span className="block h-2.5 w-2.5 rounded-full" style={{ background: "currentColor" }} />
                Record a meeting
              </Link>
              <button
                onClick={runSample}
                disabled={!configured}
                className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] px-4 py-[11px] text-[13.5px] font-medium transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-50"
                style={{ background: "transparent", color: "var(--ink-2)", border: "1px solid var(--line-strong)" }}
              >
                <Icon name="sparkle" size={14} /> Or try a sample call
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={!configured}
                className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] px-4 py-[10px] text-[13.5px] font-medium disabled:opacity-50"
                style={{ background: "transparent", color: "var(--ink-2)", border: "1px solid var(--line)" }}
              >
                <Icon name="plus" size={14} /> Bring a transcript
              </button>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".vtt,.srt,.txt,.md,text/*"
              className="hidden"
              onChange={(e) => takeFile(e.target.files?.[0])}
            />

            <TemplateSelect value={template} onChange={setTemplate} />

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
