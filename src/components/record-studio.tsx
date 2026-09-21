"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  recordingSupported,
  speechSupported,
  startSession,
  tabAudioSupported,
  type CaptureSource,
  type LiveSegment,
  type Session,
} from "@/lib/recorder";
import { putAudio } from "@/lib/audio-store";
import { saveImported } from "@/lib/imported";
import { clock } from "@/lib/format";
import { Icon, speakerVar } from "./ui";
import { TemplateSelect } from "./template-select";
import { PageHeader } from "./page-header";

// The studio.
//
// Fathom's job is taking notes from a Zoom or Meet call. Recording only your
// own microphone gets you a monologue, so this screen captures the call:
// share the tab your meeting is in and the browser hands over the far side's
// audio at source quality, mixed with your mic into one recording.
//
// Two transcription paths, and the difference between them is stated up
// front rather than discovered:
//
//   Live  — the Web Speech API, which only ever listens to the default
//           microphone. Your side, as you speak, no key required.
//   After — Deepgram over the mixed recording, which transcribes everyone
//           and diarizes them. This is the one that makes it a meeting.
//
// The one design decision worth defending: you tag the speaker *during* the
// call, with a click or a number key. Browser speech recognition does not
// diarize, and inventing speaker changes from pause length would be a guess
// dressed up as data. A human pressing "2" when someone else starts talking
// is not a limitation — on a real call it is more accurate than any diarizer,
// and it costs one keystroke.

type Phase = "idle" | "live" | "analysing";

export function RecordStudio({
  configured,
  transcription,
}: {
  configured: boolean;
  /** DEEPGRAM_API_KEY is set, so the far side can be transcribed too. */
  transcription: boolean;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [segments, setSegments] = useState<LiveSegment[]>([]);
  const [interim, setInterim] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [speaker, setSpeaker] = useState(0);
  const [names, setNames] = useState<string[]>(["You", "Guest"]);
  const [template, setTemplate] = useState("general");
  const [source, setSource] = useState<CaptureSource>("mic");
  const [farSide, setFarSide] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const session = useRef<Session | null>(null);
  const feed = useRef<HTMLDivElement>(null);
  const levels = useRef<number[]>([]);
  const farLevels = useRef<number[]>([]);
  const canvas = useRef<HTMLCanvasElement>(null);

  // Browser capabilities are client-only facts.
  //
  // Evaluating any of them during render means the server HTML and the first
  // client render disagree, which React reports as a hydration error and
  // which shows up as content flickering on load. All three are resolved
  // once, after mount, and everything renders its capable state until then.
  const [caps, setCaps] = useState<{ record: boolean; speech: boolean } | null>(null);
  useEffect(
    () => setCaps({ record: recordingSupported(), speech: speechSupported() }),
    [],
  );
  const canRecord = caps?.record ?? true;
  const canTranscribe = caps?.speech ?? true;
  // null until mounted. Whether the browser can capture a tab is only
  // knowable on the client, so the card renders its normal copy on the
  // server and the unsupported note appears afterwards — deciding it during
  // render makes the two HTMLs disagree (React #418).
  const [canShareTab, setCanShareTab] = useState<boolean | null>(null);
  useEffect(() => setCanShareTab(tabAudioSupported()), []);


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
        const css = getComputedStyle(document.documentElement);
        const step = 3;
        const n = Math.floor(r.width / step);
        // You above the line, the room below it. Two meters rather than one
        // mixed bar, because the failure this has to make obvious is "the
        // far side is not actually being captured".
        const mine = levels.current.slice(-n);
        const theirs = farLevels.current.slice(-n);
        const mid = r.height / 2;
        const draw = (
          vals: number[],
          colour: string,
          dir: -1 | 1,
        ) => {
          ctx.fillStyle = colour.trim() || "#4a9eff";
          for (let i = 0; i < vals.length; i++) {
            const h = Math.max(1.5, vals[i] * mid * 0.92);
            const x = r.width - (vals.length - i) * step;
            ctx.globalAlpha = 0.4 + (i / Math.max(1, vals.length)) * 0.6;
            ctx.fillRect(x, dir < 0 ? mid - h : mid, step - 1.2, h);
          }
        };
        draw(mine, css.getPropertyValue("--accent"), -1);
        if (theirs.length) draw(theirs, css.getPropertyValue("--sp-2"), 1);
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
    farLevels.current = [];
    try {
      const s = await startSession(
        {
          onLevel: (l) => levels.current.push(l),
          onFarLevel: (l) => farLevels.current.push(l),
          onSegment: (seg) => setSegments((xs) => [...xs, seg]),
          onInterim: setInterim,
          onError: setNote,
          onShareEnded: () =>
            setNote("Tab sharing stopped, so the far side is no longer being captured."),
        },
        source,
      );
      session.current = s;
      setFarSide(s.hasFarSide);
      s.setSpeaker(speaker);
      setPhase("live");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        /denied|not allowed|NotAllowed/i.test(msg)
          ? source === "meeting"
            ? "Screen sharing was declined. Pick the tab your call is in and tick \u201cAlso share tab audio\u201d."
            : "Microphone access was denied. Allow it in the browser's address bar and try again."
          : msg,
      );
    }
  }

  async function stop() {
    const s = session.current;
    if (!s) return;
    setPhase("analysing");
    setLog(["Closing the recording…"]);

    const { blob, mime, durationMs } = await s.stop();
    session.current = null;

    const id = `rec-${Date.now().toString(36)}`;
    if (blob) {
      setLog((l) => [
        ...l,
        `Recording saved — ${(blob.size / 1024 / 1024).toFixed(1)} MB, ${clock(durationMs)}.`,
      ]);
      await putAudio(id, blob);
    }

    // Transcription.
    //
    // Live captions only ever heard the default microphone, so on a call they
    // are your half of it. If Deepgram is configured, the mixed recording goes
    // there instead: it transcribes everyone and diarizes them, which is the
    // difference between notes on a meeting and notes on a monologue. The live
    // captions stay as the fallback, and the UI says which one was used.
    let spoken: LiveSegment[] = segments;
    let speakerNames: Record<string, string> = {};
    names.forEach((n, i) => (speakerNames[String(i)] = n));
    let transcriptSource = "live captions (your microphone only)";
    const warnings: string[] = [];

    if (blob && transcription) {
      setLog((l) => [...l, "Sending the recording for transcription and speaker separation…"]);
      try {
        const res = await fetch("/api/transcribe", {
          method: "POST",
          headers: { "Content-Type": mime || "audio/webm" },
          body: blob,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Transcription failed");
        if (Array.isArray(json.segments) && json.segments.length) {
          spoken = json.segments as LiveSegment[];
          // Deepgram numbers its speakers; it cannot know their names. Keep
          // the one name we do know and leave the rest to the repair flow.
          speakerNames = {};
          const labels = [...new Set(spoken.map((x) => x.speakerLabel))].sort((a, b) => a - b);
          for (const l of labels) speakerNames[String(l)] = `Speaker ${l + 1}`;
          transcriptSource = `${json.model} · ${json.speakerCount} speakers separated`;
          setLog((l) => [
            ...l,
            `${spoken.length} turns, ${json.speakerCount} speakers separated by ${json.model}.`,
          ]);
          warnings.push(
            "Speakers were separated automatically but not named — use the transcript's speaker repair to put names to them.",
          );
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setLog((l) => [...l, `Transcription unavailable (${msg}). Using the live captions.`]);
        warnings.push(
          `The recording could not be transcribed (${msg}), so this transcript is the live captions — your microphone only.`,
        );
      }
    } else if (blob && !transcription && farSide) {
      warnings.push(
        "The far side of this call was recorded but not transcribed: that needs DEEPGRAM_API_KEY on the server. The transcript below is your microphone only.",
      );
    }

    if (!spoken.length) {
      setPhase("idle");
      setError(
        canTranscribe
          ? "Nothing was transcribed. Check the microphone picked you up, and try again."
          : "This browser can't transcribe live. Use Chrome, or import a transcript instead.",
      );
      return;
    }

    const text = spoken
      .map(
        (s2) =>
          `${speakerNames[String(s2.speakerLabel)] ?? `Speaker ${s2.speakerLabel + 1}`}: ${s2.text}`,
      )
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
      setLog((l) =>
        [
          ...l,
          ev
            ? `Citation check: ${ev.resolved}/${ev.proposed} claims anchored${ev.dropped.length ? `, ${ev.dropped.length} discarded.` : ", none discarded."}`
            : "",
          "Opening…",
        ].filter(Boolean),
      );

      if (!blob) {
        warnings.push(
          "Audio could not be saved in this browser, so playback is unavailable. The transcript and analysis are unaffected.",
        );
      }

      saveImported({
        id,
        createdAt: new Date().toISOString(),
        templateKey: template,
        format: farSide ? `call capture · ${transcriptSource}` : `live recording · ${transcriptSource}`,
        warnings,
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
        title="Capture a meeting"
        subtitle="Share the tab your call is in and it records the whole room — not just your half of it."
      />

      {/* ---- what to capture ---- */}
      {phase === "idle" && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <SourceCard
            on={source === "meeting"}
            disabled={canShareTab === false}
            onPick={() => setSource("meeting")}
            title="A call I'm in"
            lead="Zoom, Meet or Teams in a browser tab"
            body={"Pick the tab your call is in and tick \u201cAlso share tab audio\u201d. Everyone else comes through at source quality \u2014 no bot joins, nobody is told, nothing is installed."}
            note={
              canShareTab === false
                ? "This browser can't capture another tab's audio — Chrome or Edge on desktop can."
                : undefined
            }
          />
          <SourceCard
            on={source === "mic"}
            onPick={() => setSource("mic")}
            title="Just this room"
            lead="Your microphone only"
            body="For an in-person conversation, or a call you're dialled into on another device. One voice, or several around one mic."
          />
        </div>
      )}

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
              {source === "meeting" ? "Choose the call tab" : "Start recording"}
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

          <div className="flex min-w-[180px] flex-1 flex-col gap-0.5">
            <canvas ref={canvas} className="h-11 w-full" aria-hidden />
            {phase === "live" && (
              <div className="flex items-center gap-3 text-[10.5px]" style={{ color: "var(--ink-faint)" }}>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
                  You
                </span>
                {farSide ? (
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--sp-2)" }} />
                    The call
                  </span>
                ) : (
                  <span>microphone only</span>
                )}
              </div>
            )}
          </div>

          {phase === "idle" && (
            <TemplateSelect value={template} onChange={setTemplate} />
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
      {phase === "live" && farSide && !transcription && (
        <p
          className="mb-4 rounded-[var(--radius)] px-3.5 py-2.5 text-[12.5px] leading-relaxed"
          style={{ background: "var(--warn-soft)", color: "var(--ink-2)" }}
        >
          <strong>The call is being recorded, but only you are being transcribed live.</strong>{" "}
          The browser&rsquo;s speech API can only hear your microphone. Everyone else is in the
          recording and would be transcribed and separated after the call, which needs{" "}
          <code>DEEPGRAM_API_KEY</code> on the server.
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

/** One capture source, as a card rather than a radio button — the choice
 *  between "a call I'm in" and "just this room" is the most consequential
 *  thing on the page and deserves to be legible from across the desk. */
function SourceCard({
  on,
  disabled,
  onPick,
  title,
  lead,
  body,
  note,
}: {
  on: boolean;
  disabled?: boolean;
  onPick: () => void;
  title: string;
  lead: string;
  body: string;
  note?: string;
}) {
  return (
    <button
      onClick={() => !disabled && onPick()}
      disabled={disabled}
      aria-pressed={on}
      className="rounded-[var(--radius-lg)] p-4 text-left transition-[background,border-color,transform] duration-200 disabled:cursor-not-allowed"
      style={{
        background: on ? "var(--accent-soft)" : "var(--surface)",
        border: `1px solid ${on ? "var(--accent-line)" : "var(--line)"}`,
        boxShadow: on ? "var(--lift), var(--shadow-md)" : "var(--lift)",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="grid h-4 w-4 shrink-0 place-items-center rounded-full"
          style={{ border: `1.5px solid ${on ? "var(--accent)" : "var(--line-strong)"}` }}
        >
          {on && (
            <span className="block h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
          )}
        </span>
        <span className="text-[14px] font-semibold" style={{ color: "var(--ink)" }}>
          {title}
        </span>
        <span className="text-[11.5px]" style={{ color: "var(--ink-faint)" }}>
          {lead}
        </span>
      </div>
      <p className="mt-1.5 pl-6 text-[12px] leading-[1.55]" style={{ color: "var(--ink-3)" }}>
        {body}
      </p>
      {note && (
        <p className="mt-1.5 pl-6 text-[11.5px]" style={{ color: "var(--warn-ink)" }}>
          {note}
        </p>
      )}
    </button>
  );
}
