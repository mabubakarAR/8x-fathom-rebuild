"use client";

// Reading a call aloud.
//
// The demo meetings are authored transcripts with no audio, so pressing play
// produced a moving scrubber and silence — which does not read as "this call
// has no recording", it reads as "this player is broken".
//
// Rather than fake a recording, the browser reads the transcript out loud:
// speechSynthesis is built into every browser, costs nothing, needs no key,
// and can hand each speaker a different voice. It is obviously synthetic and
// the UI says so. What it buys is that the demo has sound, the transcript
// follows along, and an eight-person call audibly sounds like eight people.
//
// Timing comes from the speech, not from a clock: each line seeks the
// playhead when it actually starts being spoken, so the transcript, the
// chapter rail and the speaker lanes stay in step with what you are hearing
// instead of drifting away from it.

export interface SpokenLine {
  startMs: number;
  text: string;
  /** Stable per-speaker index, used to pick a voice. */
  voiceSlot: number;
}

export function speechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Voices worth using, in a stable order, English first. */
function pickVoices(): SpeechSynthesisVoice[] {
  const all = window.speechSynthesis.getVoices();
  if (!all.length) return [];
  const en = all.filter((v) => /^en(-|_|$)/i.test(v.lang));
  const pool = en.length ? en : all;
  // Prefer the higher-quality local voices browsers ship, then anything else.
  const ranked = [...pool].sort((a, b) => Number(b.localService) - Number(a.localService));
  return ranked;
}

/** getVoices() is empty until the list loads, which is async in Chrome. */
export function whenVoicesReady(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!speechAvailable()) return resolve([]);
    const now = pickVoices();
    if (now.length) return resolve(now);
    const onChange = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", onChange);
      resolve(pickVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", onChange);
    // Some browsers never fire it; do not hang the UI waiting.
    setTimeout(() => resolve(pickVoices()), 1200);
  });
}

export interface Reader {
  stop(): void;
  setRate(r: number): void;
}

export async function readAloud(
  lines: SpokenLine[],
  opts: {
    from?: number;
    rate?: number;
    onSeek(ms: number): void;
    onEnd(): void;
  },
): Promise<Reader> {
  const synth = window.speechSynthesis;
  synth.cancel();

  const voices = await whenVoicesReady();
  let rate = opts.rate ?? 1;
  let cancelled = false;
  let i = Math.max(
    0,
    lines.findIndex((l) => l.startMs >= (opts.from ?? 0)),
  );
  if (i < 0) i = 0;

  const speakNext = () => {
    if (cancelled) return;
    if (i >= lines.length) {
      opts.onEnd();
      return;
    }
    const line = lines[i];
    const u = new SpeechSynthesisUtterance(line.text);
    if (voices.length) u.voice = voices[line.voiceSlot % voices.length];
    u.rate = rate;
    // A little pitch spread so two speakers on the same voice are still
    // distinguishable — most systems ship fewer distinct voices than a
    // meeting has people.
    u.pitch = 1 + ((line.voiceSlot % 5) - 2) * 0.07;
    u.onstart = () => {
      if (!cancelled) opts.onSeek(line.startMs);
    };
    u.onend = () => {
      if (cancelled) return;
      i += 1;
      speakNext();
    };
    u.onerror = () => {
      if (cancelled) return;
      i += 1;
      speakNext();
    };
    synth.speak(u);
  };

  speakNext();

  return {
    stop() {
      cancelled = true;
      synth.cancel();
    },
    setRate(r) {
      rate = r;
      // Rate only applies to utterances not yet queued; restart the current
      // line so the change is audible immediately.
      const at = lines[Math.min(i, lines.length - 1)]?.startMs ?? 0;
      synth.cancel();
      i = Math.max(0, lines.findIndex((l) => l.startMs >= at));
      if (i < 0) i = 0;
      if (!cancelled) speakNext();
    },
  };
}
