// Real capture — including the other people on the call.
//
// Fathom's whole job is taking notes from a Zoom or Meet call. Recording only
// your own microphone gets you a monologue, which is not a meeting, and that
// gap is the difference between a notetaker and a dictaphone.
//
// The browser can close it without a bot, an extension or a desktop app:
//
//   getDisplayMedia({audio:true})  → the meeting tab's audio. When you share
//                                    the Zoom/Meet tab and tick "share tab
//                                    audio", this is everyone else on the
//                                    call, at source quality, with no echo
//                                    and no room noise.
//   getUserMedia()                 → you.
//   Web Audio                      → both mixed into one stream, so the
//                                    recording is the conversation rather
//                                    than one side of it.
//   MediaRecorder                  → one file, both sides.
//   AnalyserNode ×2                → separate level meters, so you can see at
//                                    a glance that the far side is actually
//                                    being captured. Silently recording
//                                    silence is the worst possible failure
//                                    for this feature.
//   SpeechRecognition              → live captions while the call runs.
//
// One honest limit: the Web Speech API only ever listens to the default
// microphone. It cannot be pointed at the mixed stream, so live captions are
// your side only. The far side is transcribed after the call by Deepgram,
// which also diarizes it — and the UI says exactly that rather than letting
// someone discover it afterwards.

export interface LiveSegment {
  /** Which speaker this was tagged to at the time it was said. */
  speakerLabel: number;
  startMs: number;
  endMs: number;
  text: string;
  /** Speech API confidence where it gives one. */
  confidence: number;
}

export function speechSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition,
  );
}

export function recordingSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== "undefined"
  );
}

/** Whether this browser can capture another tab's audio. */
export function tabAudioSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    Boolean(
      (navigator.mediaDevices as MediaDevices & { getDisplayMedia?: unknown })
        ?.getDisplayMedia,
    )
  );
}

export type CaptureSource = "mic" | "meeting";

/** The first mime type this browser will actually record. Safari and Chrome
 *  disagree, and MediaRecorder throws rather than degrading. */
function pickMime(): string | undefined {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(c)) return c;
  }
  return undefined;
}

interface SpeechResultLike {
  isFinal: boolean;
  0: { transcript: string; confidence: number };
  length: number;
}
interface SpeechEventLike {
  resultIndex: number;
  results: { length: number; [i: number]: SpeechResultLike };
}
interface RecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechEventLike) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

export interface SessionHandlers {
  /** Fires continuously with your own mic level, 0..1. */
  onLevel(level: number): void;
  /** Fires with the far side's level when capturing a meeting tab. */
  onFarLevel?(level: number): void;
  /** The user stopped sharing from the browser's own share bar. */
  onShareEnded?(): void;
  /** A finalised piece of speech. */
  onSegment(seg: LiveSegment): void;
  /** The in-flight partial, so the UI can show words before they settle. */
  onInterim(text: string): void;
  onError(message: string): void;
}

export interface Session {
  /** Which speaker new segments are attributed to. Changed live by the UI. */
  setSpeaker(label: number): void;
  elapsedMs(): number;
  /** True when the far side of a call is being captured too. */
  readonly hasFarSide: boolean;
  /** Resolves with the recorded audio once everything has flushed. */
  stop(): Promise<{ blob: Blob | null; mime: string | undefined; durationMs: number }>;
}

export async function startSession(
  h: SessionHandlers,
  source: CaptureSource = "mic",
): Promise<Session> {
  // Your microphone. Echo cancellation matters more than usual here: without
  // it, capturing the meeting tab while your speakers play it back records
  // the far side twice, half a beat apart.
  const mic = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  // The meeting tab. Video has to be requested — Chrome will not offer tab
  // audio for an audio-only request — but it is discarded immediately, so
  // nothing is ever recorded from the screen.
  let display: MediaStream | null = null;
  if (source === "meeting") {
    try {
      display = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      if (!display.getAudioTracks().length) {
        for (const t of display.getTracks()) t.stop();
        display = null;
        throw new Error(
          'No audio came with that share. Pick the tab your call is in and tick "Also share tab audio".',
        );
      }
      for (const t of display.getVideoTracks()) {
        t.stop();
        display.removeTrack(t);
      }
      display.getAudioTracks()[0].addEventListener("ended", () => h.onShareEnded?.());
    } catch (e) {
      for (const t of mic.getTracks()) t.stop();
      throw e;
    }
  }

  const t0 = performance.now();
  const elapsedMs = () => performance.now() - t0;
  let speaker = 0;

  // ---- mixing and metering -------------------------------------------------
  const AudioCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ac = new AudioCtor();

  const mixed = ac.createMediaStreamDestination();

  const tap = (src: MediaStream) => {
    const node = ac.createMediaStreamSource(src);
    const analyser = ac.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.72;
    node.connect(analyser);
    node.connect(mixed);
    return analyser;
  };

  const micAnalyser = tap(mic);
  const farAnalyser = display ? tap(display) : null;

  const rms = (analyser: AnalyserNode, buf: Uint8Array<ArrayBuffer>) => {
    analyser.getByteTimeDomainData(buf);
    // RMS around the 128 midpoint, which is what actually tracks loudness.
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const d = (buf[i] - 128) / 128;
      sum += d * d;
    }
    return Math.min(1, Math.sqrt(sum / buf.length) * 3.2);
  };

  const micBuf = new Uint8Array(new ArrayBuffer(micAnalyser.frequencyBinCount));
  const farBuf = farAnalyser
    ? new Uint8Array(new ArrayBuffer(farAnalyser.frequencyBinCount))
    : null;
  let raf = 0;
  const meter = () => {
    h.onLevel(rms(micAnalyser, micBuf));
    if (farAnalyser && farBuf) h.onFarLevel?.(rms(farAnalyser, farBuf));
    raf = requestAnimationFrame(meter);
  };
  raf = requestAnimationFrame(meter);

  // ---- the recording -------------------------------------------------------
  // The mixed destination, not the raw mic — so the file contains the
  // conversation rather than one side of it.
  const stream = mixed.stream;
  const mime = pickMime();
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks: BlobPart[] = [];
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };
  rec.start(1000);

  // ---- live transcription --------------------------------------------------
  let recog: RecognitionLike | null = null;
  let stopping = false;
  if (speechSupported()) {
    const Ctor = ((window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>)
        .webkitSpeechRecognition) as new () => RecognitionLike;
    recog = new Ctor();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = navigator.language || "en-US";
    recog.maxAlternatives = 1;

    // The Speech API gives no timings, so each finalised phrase is stamped
    // with the clock at the moment it settled and back-dated by its own
    // spoken length at a normal speaking rate. Approximate, and the UI says
    // so — but it puts every line within a second or two of the audio, which
    // is what citations need.
    let lastEnd = 0;
    recog.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const alt = r[0];
        if (!alt) continue;
        if (r.isFinal) {
          const text = alt.transcript.trim();
          if (!text) continue;
          const now = elapsedMs();
          const words = text.split(/\s+/).length;
          const spokenMs = Math.max(700, (words / 2.6) * 1000);
          const start = Math.max(lastEnd, now - spokenMs);
          lastEnd = now;
          h.onSegment({
            speakerLabel: speaker,
            startMs: Math.round(start),
            endMs: Math.round(now),
            text,
            confidence: typeof alt.confidence === "number" && alt.confidence > 0 ? alt.confidence : 0.9,
          });
        } else {
          interim += alt.transcript;
        }
      }
      h.onInterim(interim.trim());
    };

    recog.onerror = (e) => {
      const code = e?.error ?? "unknown";
      // "no-speech" and "aborted" are normal and not worth alarming anyone.
      if (code === "no-speech" || code === "aborted") return;
      if (code === "not-allowed" || code === "service-not-allowed") {
        h.onError("The browser blocked live transcription. The recording is still running.");
      } else if (code === "network") {
        h.onError("Live transcription lost its connection. The recording is still running.");
      }
    };

    // Chrome ends the session on its own every so often. Restart until we are
    // genuinely done, or a long meeting silently stops transcribing halfway.
    recog.onend = () => {
      if (stopping) return;
      try {
        recog?.start();
      } catch {
        /* already starting; the next onend will retry */
      }
    };

    try {
      recog.start();
    } catch {
      h.onError("Live transcription could not start. The recording is still running.");
    }
  }

  return {
    hasFarSide: Boolean(display),
    setSpeaker(label) {
      speaker = label;
    },
    elapsedMs,
    async stop() {
      stopping = true;
      cancelAnimationFrame(raf);
      try {
        recog?.stop();
      } catch {
        /* nothing to stop */
      }

      const durationMs = elapsedMs();
      const blob = await new Promise<Blob | null>((resolve) => {
        if (rec.state === "inactive") {
          resolve(chunks.length ? new Blob(chunks, { type: mime || "audio/webm" }) : null);
          return;
        }
        rec.onstop = () =>
          resolve(chunks.length ? new Blob(chunks, { type: mime || "audio/webm" }) : null);
        rec.stop();
      });

      for (const t of mic.getTracks()) t.stop();
      for (const t of display?.getTracks() ?? []) t.stop();
      void ac.close().catch(() => {});

      return { blob, mime, durationMs };
    },
  };
}
