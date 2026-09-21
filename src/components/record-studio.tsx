"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  recordingSupported,
  speechSupported,
  startSession,
  type LiveSegment,
  type Session,
} from "@/lib/recorder";
import { putAudio } from "@/lib/audio-store";
import { saveImported } from "@/lib/imported";
import { clock } from "@/lib/format";
import { Icon, speakerVar } from "./ui";
import { PageHeader } from "./page-header";

// The studio.
//
// This is the screen the product was missing: the place where a meeting
// actually happens. Press record and it is your microphone, a real file, and
// a transcript that fills in while you speak — then the pipeline that already
// existed turns it into notes where every claim cites a line.
//
// The one design decision worth defending: you tag the speaker *during* the
// call, with a click or a number key. Browser speech recognition does not
// diarize, and inventing speaker changes from pause length would be a guess
// dressed up as data. A human pressing "2" when someone else starts talking
// is not a limitation — on a real call it is more accurate than any diarizer,
// and it costs one keystroke.

const TEMPLATES = [
  ["general", "General"],
  ["sales", "Sales"],
  ["one-on-one", "One-on-one"],
  ["project-update", "Project update"],
  ["retro", "Retrospective"],
  ["interview", "Interview"],
  ["qa", "Q&A"],
] as const;

type Phase = "idle" | "live" | "analysing";

export function RecordStudio({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [segments, setSegments] = useState<LiveSegment[]>([]);
  const [interim, setInterim] = useState("");
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [speaker, setSpeaker] = useState(0);
  const [names, setNames] = useState<string[]>(["You", "Guest"]);
  const [template, setTemplate] = useState("general");
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const session = useRef<Session | null>(null);
  const feed = useRef<HTMLDivElement>(null);
  const levels = useRef<number[]>([]);
  const canvas = useRef<HTMLCanvasElement>(null);

  const canRecord = recordingSupported();
  const canTranscribe = speechSupported();

  // ---- elapsed clock -------------------------------------------------------
  useEffect(() => {
    if (phase !== "live") return;
    const t = setInterval(() => setElapsed(session.current?.elapsedMs() ?? 0), 200);
    return () => clearInterval(t);
  }, [phase]);

  // ---- the live waveform ---------------------------------------------------
  // Every level sample is kept and drawn, so by the end of the call the strip
  // is a picture of the whole recording rather than a decorative bouncer.
  useEffect(() => {
    if (phase !== "live") return;
    let raf = 0;
    const draw = () => {
      const cv = canvas.current;
      const ctx = cv?.getContext("2d");
      if (cv && ctx) {
        const r = cv.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (cv.width !== Math.round(r.width * dpr)) {
          cv.width = Math.round(r.width * dpr);
          cv.height = Math.round(r.height * dpr);
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, r.width, r.height);
        const all = levels.current;
        const step = 3;
        const n = Math.floor(r.width / step);
        const slice = all.slice(-n);
        const colour = getComputedStyle(document.documentElement)
          .getPropertyValue("--accent")
          .trim() || "#00beff";
        ctx.fillStyle = colour;
        for (let i = 0; i < slice.length; i++) {
          const h = Math.max(2, slice[i] * r.height * 0.92);
          const x = r.width - (slice.length - i) * step;
          ctx.globalAlpha = 0.35 + (i / Math.max(1, slice.length)) * 0.65;
          ctx.fillRect(x, (r.height - h) / 2, step - 1.2, h);
        }
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  useEffect(() => {
    feed.current?.scrollTo({ top: feed.current.scrollHeight, behavior: "smooth" });
  }, [segments.length, interim]);

  const pickSpeaker = useCallback((i: number) => {
    setSpeaker(i);
    session.current?.setSpeaker(i);
  }, []);

  // Number keys switch speaker mid-sentence without leaving the transcript.
  useEffect(() => {
    if (phase !== "live") return;
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      if (el instanceof HTMLElement && (el.tagName === "INPUT" || el.isContentEditable)) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= names.length) {
        e.preventDefault();
        pickSpeaker(n - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, names.length, pickSpeaker]);

  async function start() {
    setError(null);
    setNote(null);
    setSegments([]);
    setInterim("");
    levels.current = [];
    try {
      const s = await startSession({
        onLevel: (l) => {
          levels.current.push(l);
          setLevel(l);
        },
        onSegment: (seg) => setSegments((xs) => [...xs, seg]),
        onInterim: setInterim,
        onError: setNote,
      });
      session.current = s;
      s.setSpeaker(speaker);
      setPhase("live");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        /denied|not allowed/i.test(msg)
          ? "Microphone access was denied. Allow it in the browser's address bar and try again."
          : `Could not start the microphone: ${msg}`,
      );
    }
  }

  async function stop() {
    const s = session.current;
    if (!s) return;
    setPhase("analysing");
    setLog(["Closing the recording…"]);

    const { blob, durationMs } = await s.stop();
    session.current = null;

    const spoken = segments;
    if (!spoken.length) {
      setPhase("idle");
      setError(
        canTranscribe
          ? "Nothing was transcribed. Check the microphone picked you up, and try again."
          : "This browser can't transcribe live. Use Chrome, or import a transcript instead.",
      );
      return;
    }

    const id = `rec-${Date.now().toString(36)}`;
    if (blob) {
      setLog((l) => [...l, `Recording saved — ${(blob.size / 1024 / 1024).toFixed(1)} MB, ${clock(durationMs)}.`]);
      await putAudio(id, blob);
    }

    // Send it through the same route an imported file uses. The pipeline does
    // not know or care that these words arrived from a microphone.
    const text = spoken
      .map((s2) => `${names[s2.speakerLabel] ?? `Speaker ${s2.speakerLabel + 1}`}: ${s2.text}`)
      .join("\n");

    setLog((l) => [...l, `${spoken.length} turns captured. Sending to the model…`]);

    try {
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
        ev
          ? `Citation check: ${ev.resolved}/${ev.proposed} claims anchored${ev.dropped.length ? `, ${ev.dropped.length} discarded.` : ", none discarded."}`
          : "",
        "Opening…",
      ].filter(Boolean));

      // Keep OUR timings, not the parser's estimates — these came from a real
      // clock running against real audio, which is strictly better data.
      const speakerNames: Record<string, string> = {};
      names.forEach((n, i) => (speakerNames[String(i)] = n));

      saveImported({
        id,
        createdAt: new Date().toISOString(),
        templateKey: template,
        format: "live recording",
        warnings: blob
          ? []
          : ["Audio could not be saved in this browser, so playback is unavailable. The transcript and analysis are unaffected."],
        segments: spoken,
        speakerNames,
        analysis: json.analysis,
      });
      router.push(`/imported/${id}`);
    } catch (e) {
      setPhase("idle");
      setError(e instanceof Error ? e.message : "Analysis failed");
    }
  }

  // ---------------------------------------------------------------- render --

  if (!canRecord) {
    return (
      <div className="mx-auto w-full max-w-[720px] px-4 pb-24 md:px-8">
        <PageHeader title="Record a meeting" subtitle="This browser can't capture audio." />
        <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--ink-2)" }}>
          Recording needs <code>MediaRecorder</code> and microphone access, which this browser
          doesn&rsquo;t provide.{" "}
          <Link href="/import" className="underline" style={{ color: "var(--accent-ink)" }}>
            Import a transcript
          </Link>{" "}
          instead — everything after capture is identical.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 pb-24 md:px-8">
      <PageHeader
        title="Record a meeting"
        subtitle="Your microphone, transcribed as you speak, then read by a model that has to cite its sources."
      />

      {/* ---- the deck ---- */}
      <div
        className="mb-4 overflow-hidden rounded-[var(--radius-lg)]"
        style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}
      >
        <div className="flex flex-wrap items-center gap-4 px-5 py-4">
          {phase === "idle" ? (
            <button
              onClick={start}
              className="inline-flex items-center gap-2.5 rounded-full py-[11px] pr-5 pl-4 text-[14px] font-semibold transition-transform hover:scale-[1.02]"
              style={{ background: "var(--danger)", color: "oklch(100% 0 0)", boxShadow: "var(--shadow-md)" }}
            >
              <span className="grid h-4 w-4 place-items-center">
                <span className="block h-3 w-3 rounded-full" style={{ background: "currentColor" }} />
              </span>
              Start recording
            </button>
          ) : (
            <button
              onClick={stop}
              disabled={phase === "analysing"}
              className="inline-flex items-center gap-2.5 rounded-full py-[11px] pr-5 pl-4 text-[14px] font-semibold disabled:opacity-60"
              style={{ background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--line-strong)" }}
            >
              <span className="block h-3 w-3 rounded-[2px]" style={{ background: "var(--danger)" }} />
              {phase === "analysing" ? "Finishing…" : "Stop and write the notes"}
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                background: phase === "live" ? "var(--danger)" : "var(--ink-faint)",
                animation: phase === "live" ? "rec-pulse 1.4s ease-in-out infinite" : undefined,
              }}
            />
            <span className="text-[20px] font-semibold tnum" style={{ color: "var(--ink)" }}>
              {clock(elapsed)}
            </span>
          </div>

          <canvas ref={canvas} className="h-10 min-w-[160px] flex-1" aria-hidden />

          {phase === "idle" && (
            <div className="flex flex-wrap items-center gap-1.5">
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
          )}
        </div>

        {/* ---- who's talking ---- */}
        {phase !== "analysing" && (
          <div
            className="flex flex-wrap items-center gap-2 px-5 py-3"
            style={{ borderTop: "1px solid var(--line)", background: "var(--surface-2)" }}
          >
            <span className="text-[11px] font-semibold tracking-[0.06em] uppercase" style={{ color: "var(--ink-faint)" }}>
              Speaking
            </span>
            {names.map((n, i) => (
              <button
                key={i}
                onClick={() => pickSpeaker(i)}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-[5px] text-[12.5px] font-medium transition-colors"
                style={{
                  background: speaker === i ? "var(--surface)" : "transparent",
                  color: speaker === i ? "var(--ink)" : "var(--ink-3)",
                  border: `1px solid ${speaker === i ? speakerVar(i) : "var(--line)"}`,
                  boxShadow: speaker === i ? "var(--shadow-sm)" : undefined,
                }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: speakerVar(i) }} />
                {n}
                <kbd className="text-[10px]" style={{ color: "var(--ink-faint)" }}>{i + 1}</kbd>
              </button>
            ))}
            <button
              onClick={() => setNames((ns) => [...ns, `Speaker ${ns.length + 1}`])}
              className="rounded-full px-2 py-[5px] text-[12px]"
              style={{ color: "var(--ink-3)", border: "1px dashed var(--line-strong)" }}
            >
              <Icon name="plus" size={12} />
            </button>
            <span className="ml-auto text-[11px]" style={{ color: "var(--ink-faint)" }}>
              Click a name, or press its number, when someone else starts talking.
            </span>
          </div>
        )}
      </div>

      {/* ---- messages ---- */}
      {!canTranscribe && phase === "idle" && (
        <p
          className="mb-4 rounded-[var(--radius)] px-3.5 py-2.5 text-[12.5px] leading-relaxed"
          style={{ background: "var(--warn-soft)", color: "var(--ink-2)" }}
        >
          <strong>Live transcription needs Chrome or Edge.</strong> This browser will still record
          the audio, but no words will appear — the Web Speech API isn&rsquo;t available here. On
          Safari or Firefox,{" "}
          <Link href="/import" className="underline" style={{ color: "var(--accent-ink)" }}>
            importing a transcript
          </Link>{" "}
          is the route that works.
        </p>
      )}
      {!configured && (
        <p
          className="mb-4 rounded-[var(--radius)] px-3.5 py-2.5 text-[12.5px]"
          style={{ background: "var(--warn-soft)", color: "var(--ink-2)" }}
        >
          <strong>No <code>ANTHROPIC_API_KEY</code> on this deployment.</strong> Recording and live
          transcription work; the notes step will fail until a key is set.
        </p>
      )}
      {note && (
        <p className="mb-4 text-[12.5px]" style={{ color: "var(--warn-ink)" }}>{note}</p>
      )}
      {error && (
        <p className="mb-4 text-[13px]" style={{ color: "var(--danger)" }}>{error}</p>
      )}

      {/* ---- the transcript as it happens ---- */}
      <div
        className="overflow-hidden rounded-[var(--radius-lg)]"
        style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
      >
        <div
          className="flex items-center justify-between px-4 py-2.5"
          style={{ borderBottom: "1px solid var(--line)" }}
        >
          <span className="text-[11px] font-semibold tracking-[0.07em] uppercase" style={{ color: "var(--ink-faint)" }}>
            Live transcript
          </span>
          <span className="text-[11.5px] tnum" style={{ color: "var(--ink-faint)" }}>
            {segments.length} turns · {segments.reduce((n, s) => n + s.text.split(/\s+/).length, 0)} words
          </span>
        </div>

        <div ref={feed} className="scroll-thin max-h-[46vh] min-h-[220px] overflow-y-auto px-4 py-3">
          {phase === "analysing" ? (
            <ol className="flex flex-col gap-1.5">
              {log.map((line, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: "var(--ink-2)" }}>
                  <span className="mt-[3px]" style={{ color: i === log.length - 1 ? "var(--accent)" : "var(--ok)" }}>
                    <Icon name={i === log.length - 1 ? "dot" : "check"} size={12} />
                  </span>
                  {line}
                </li>
              ))}
            </ol>
          ) : segments.length === 0 && !interim ? (
            <p className="py-10 text-center text-[13px]" style={{ color: "var(--ink-faint)" }}>
              {phase === "live"
                ? "Listening — start talking."
                : "Press record and speak. Words appear here as you say them."}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {segments.map((s, i) => {
                const newSpeaker = i === 0 || segments[i - 1].speakerLabel !== s.speakerLabel;
                return (
                  <li key={i} className="flex gap-2.5">
                    <span className="w-[42px] shrink-0 pt-[2px] text-[11px] tnum" style={{ color: "var(--ink-faint)" }}>
                      {clock(s.startMs)}
                    </span>
                    <span className="min-w-0 flex-1">
                      {newSpeaker && (
                        <span
                          className="mr-1.5 text-[12.5px] font-semibold"
                          style={{ color: speakerVar(s.speakerLabel) }}
                        >
                          {names[s.speakerLabel] ?? `Speaker ${s.speakerLabel + 1}`}
                        </span>
                      )}
                      <span className="text-[13.5px] leading-[1.6]" style={{ color: "var(--ink-2)" }}>
                        {s.text}
                      </span>
                    </span>
                  </li>
                );
              })}
              {interim && (
                <li className="flex gap-2.5">
                  <span className="w-[42px] shrink-0" />
                  <span
                    className="text-[13.5px] leading-[1.6] italic"
                    style={{ color: "var(--ink-faint)" }}
                  >
                    {interim}…
                  </span>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      <p className="mt-3 text-[11.5px] leading-relaxed" style={{ color: "var(--ink-faint)" }}>
        Audio is recorded in your browser and stored there. Nothing is uploaded except the text of
        the transcript, which goes to Anthropic to be turned into notes. Live transcription uses the
        browser&rsquo;s own speech API — in Chrome that means audio is processed by Google, which is
        worth knowing before you record anything sensitive.
      </p>
    </div>
  );
}
