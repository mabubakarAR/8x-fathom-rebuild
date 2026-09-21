import "server-only";

// Real transcription, via Deepgram.
//
// Deepgram rather than Whisper for one reason: diarization. Whisper has none,
// and speaker attribution is the entire thesis of this rebuild — the
// best-evidenced complaint about Fathom is misattribution under crosstalk, and
// the repair flow is the answer to it. A transcript with no speakers would
// make that whole argument undemonstrable.
//
// nova-3 with utterances=true returns speech grouped into turns with a speaker
// label and per-utterance confidence, which is exactly the shape of the
// Segment type the UI already speaks.

export interface RawSegment {
  speakerLabel: number;
  startMs: number;
  endMs: number;
  text: string;
  confidence: number;
}

export interface TranscriptionResult {
  segments: RawSegment[];
  durationMs: number;
  speakerCount: number;
  /** Deepgram's model id, recorded so the provenance is in the data. */
  model: string;
}

export function transcriptionConfigured(): boolean {
  return Boolean(process.env.DEEPGRAM_API_KEY);
}

interface DeepgramUtterance {
  start: number;
  end: number;
  confidence: number;
  transcript: string;
  speaker?: number;
}

/**
 * Transcribe raw media bytes.
 *
 * `utterances=true` is what gives turn-level grouping; without it you get one
 * flat word stream and have to segment it yourself, badly.
 */
export async function transcribe(
  bytes: ArrayBuffer,
  mime: string,
): Promise<TranscriptionResult> {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) throw new Error("DEEPGRAM_API_KEY is not set");

  const params = new URLSearchParams({
    model: "nova-3",
    diarize: "true",
    utterances: "true",
    punctuate: "true",
    smart_format: "true",
    paragraphs: "false",
    language: "en",
  });

  const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${key}`,
      "Content-Type": mime || "application/octet-stream",
    },
    body: bytes,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Deepgram ${res.status}: ${body.slice(0, 400) || res.statusText}`,
    );
  }

  const json = (await res.json()) as {
    metadata?: { duration?: number; models?: string[] };
    results?: { utterances?: DeepgramUtterance[] };
  };

  const utterances = json.results?.utterances ?? [];
  if (!utterances.length) {
    throw new Error(
      "Deepgram returned no speech. The file may be silent, corrupt, or an unsupported codec.",
    );
  }

  const segments: RawSegment[] = utterances
    .filter((u) => u.transcript?.trim())
    .map((u) => ({
      speakerLabel: u.speaker ?? 0,
      startMs: Math.round(u.start * 1000),
      endMs: Math.round(u.end * 1000),
      text: u.transcript.trim(),
      confidence: typeof u.confidence === "number" ? u.confidence : 1,
    }));

  // Crosstalk detection. Deepgram does not flag overlap directly, but a turn
  // that starts before the previous one ended is exactly that — and those are
  // the moments where diarization is least reliable, which is what the UI's
  // amber markers and "needs review" filter are for.
  const withOverlap = segments.map((s, i) => {
    const prev = segments[i - 1];
    const overlaps = Boolean(prev && s.startMs < prev.endMs - 120);
    return overlaps ? { ...s, confidence: Math.min(s.confidence, 0.74) } : s;
  });

  const durationMs = json.metadata?.duration
    ? Math.round(json.metadata.duration * 1000)
    : Math.max(...withOverlap.map((s) => s.endMs), 0);

  return {
    segments: withOverlap,
    durationMs,
    speakerCount: new Set(withOverlap.map((s) => s.speakerLabel)).size,
    model: json.metadata?.models?.[0] ? "deepgram/nova-3" : "deepgram/nova-3",
  };
}

/** True when a segment pair overlaps in time — used by the writer to set the flag. */
export function isCrosstalk(prev: RawSegment | undefined, s: RawSegment): boolean {
  return Boolean(prev && s.startMs < prev.endMs - 120);
}
