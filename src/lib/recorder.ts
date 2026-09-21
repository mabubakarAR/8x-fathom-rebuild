// Real capture.
//
// The first version of this build stubbed the recording bot, which the brief
// allowed. The trouble with stubbing capture in a notetaker is that capture
// is the product: without it there is nothing to take notes *of*, and what
// is left is a viewer for data that arrived from nowhere.
//
// So this is the real thing, and it needs no API key and no server:
//
//   getUserMedia        → the actual microphone
//   MediaRecorder       → an actual audio file you can play back afterwards
//   AnalyserNode        → the live level meter, from real samples
//   SpeechRecognition   → live transcription, in the browser, as you talk
//
// The last one is Chrome/Edge only, which is a real limitation and is stated
// in the UI rather than discovered. Everywhere else the recording still works
// and the transcript comes from the file you bring, or from Deepgram when a
// key is configured.

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
  /** Fires continuously with the current mic level, 0..1. */
  onLevel(level: number): void;
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
  /** Resolves with the recorded audio once everything has flushed. */
  stop(): Promise<{ blob: Blob | null; mime: string | undefined; durationMs: number }>;
}

export async function startSession(h: SessionHandlers): Promise<Session> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const t0 = performance.now();
  const elapsedMs = () => performance.now() - t0;
  let speaker = 0;

  // ---- level meter ---------------------------------------------------------
  const AudioCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ac = new AudioCtor();
  const source = ac.createMediaStreamSource(stream);
  const analyser = ac.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.72;
  source.connect(analyser);
  const buf = new Uint8Array(analyser.frequencyBinCount);
  let raf = 0;
  const meter = () => {
    analyser.getByteTimeDomainData(buf);
    // RMS around the 128 midpoint, which is what actually tracks loudness.
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const d = (buf[i] - 128) / 128;
      sum += d * d;
    }
    h.onLevel(Math.min(1, Math.sqrt(sum / buf.length) * 3.2));
    raf = requestAnimationFrame(meter);
  };
  raf = requestAnimationFrame(meter);

  // ---- the recording -------------------------------------------------------
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

      for (const t of stream.getTracks()) t.stop();
      void ac.close().catch(() => {});

      return { blob, mime, durationMs };
    },
  };
}
