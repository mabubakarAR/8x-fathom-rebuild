"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Badge, Icon } from "./ui";
import { PageHeader } from "./page-header";

// The real pipeline, with its steps visible.
//
// Upload, transcription and analysis are three separate server calls, because
// a serverless function gets 60 seconds and the whole chain does not fit. That
// constraint turns out to be a feature: the user watches the thing actually
// happen — file stored, Deepgram returns N segments, Claude returns N bullets
// — instead of staring at one long spinner and hoping.
//
// Failures surface the real error string. "Something went wrong" is not a
// state anyone can act on.

type Phase = "idle" | "uploading" | "transcribing" | "analysing" | "done" | "failed";

const TEMPLATES = [
  ["general", "General"],
  ["sales", "Sales"],
  ["one-on-one", "One-on-one"],
  ["project-update", "Project update"],
  ["retro", "Retrospective"],
  ["interview", "Interview"],
  ["qa", "Q&A"],
] as const;

interface Ready {
  database: boolean;
  storage: boolean;
  transcription: boolean;
  analysis: boolean;
}

export function UploadFlow({ ready }: { ready: Ready }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [template, setTemplate] = useState("general");
  const [phase, setPhase] = useState<Phase>("idle");
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const allReady = ready.database && ready.storage && ready.transcription && ready.analysis;
  const say = (s: string) => setLog((l) => [...l, s]);

  async function run() {
    if (!file) return;
    setError(null);
    setLog([]);
    setPhase("uploading");

    try {
      say(`Uploading ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)…`);
      const fd = new FormData();
      fd.set("file", file);
      fd.set("template", template);
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      const upJson = await up.json();
      if (!up.ok) throw new Error(upJson.error || "Upload failed");
      const id = upJson.id as string;
      setMeetingId(id);
      say(`Stored. Meeting ${id}.`);

      setPhase("transcribing");
      say("Transcribing with Deepgram nova-3, diarization on…");
      const tr = await fetch(`/api/meetings/${id}/transcribe`, { method: "POST" });
      const trJson = await tr.json();
      if (!tr.ok) throw new Error(trJson.error || "Transcription failed");
      say(`${trJson.segments} speaker turns transcribed and stored.`);

      setPhase("analysing");
      say("Analysing with Claude — chapters, summary, action items, clips…");
      const an = await fetch(`/api/meetings/${id}/analyse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template }),
      });
      const anJson = await an.json();
      if (!an.ok) throw new Error(anJson.error || "Analysis failed");
      say(
        `${anJson.chapters} chapters, ${anJson.bullets} cited bullets, ${anJson.actions} action items.`,
      );

      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("failed");
    }
  }

  const busy = phase === "uploading" || phase === "transcribing" || phase === "analysing";

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 pb-24 md:px-8">
      <PageHeader
        title="Upload a recording"
        subtitle="Real pipeline: your file is stored, transcribed with speaker diarization, then analysed. Everything downstream is generated from that transcript, not seeded."
      />

      {!allReady && (
        <div
          className="mb-4 rounded-[var(--radius-lg)] p-3.5"
          style={{ background: "var(--warn-soft)", border: "1px solid var(--warn)" }}
        >
          <div className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold" style={{ color: "var(--warn)" }}>
            <Icon name="warn" size={14} /> Not fully configured
          </div>
          <ul className="flex flex-col gap-0.5 text-[12.5px]" style={{ color: "var(--ink-2)" }}>
            {!ready.database && <li>· <code>DATABASE_URL</code> missing — nothing can be stored</li>}
            {!ready.storage && <li>· <code>SUPABASE_URL</code> / <code>SUPABASE_SERVICE_ROLE_KEY</code> missing</li>}
            {!ready.transcription && <li>· <code>DEEPGRAM_API_KEY</code> missing</li>}
            {!ready.analysis && <li>· <code>ANTHROPIC_API_KEY</code> missing</li>}
          </ul>
          <p className="mt-2 text-[12px]" style={{ color: "var(--ink-3)" }}>
            Set them in the deployment&rsquo;s environment, redeploy, then hit{" "}
            <code>/api/setup</code> once to apply the schema.
          </p>
        </div>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) setFile(f);
        }}
        onClick={() => !busy && inputRef.current?.click()}
        className="cursor-pointer rounded-[var(--radius-lg)] px-6 py-10 text-center transition-colors"
        style={{
          background: drag ? "var(--accent-soft)" : "var(--surface)",
          border: `1.5px dashed ${drag ? "var(--accent)" : "var(--line-strong)"}`,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,video/*,.mp3,.m4a,.wav,.mp4,.mov,.webm,.ogg"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <div className="mb-2 flex justify-center" style={{ color: "var(--ink-faint)" }}>
          <Icon name="download" size={22} />
        </div>
        {file ? (
          <>
            <div className="text-[14px] font-semibold">{file.name}</div>
            <div className="mt-0.5 text-[12.5px] tnum" style={{ color: "var(--ink-3)" }}>
              {(file.size / 1024 / 1024).toFixed(1)} MB · {file.type || "unknown type"}
            </div>
          </>
        ) : (
          <>
            <div className="text-[14px] font-medium">Drop an audio or video file</div>
            <div className="mt-1 text-[12.5px]" style={{ color: "var(--ink-3)" }}>
              mp3, m4a, wav, mp4, mov, webm · up to 190&nbsp;MB · a 2-minute clip is plenty
            </div>
          </>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[12.5px]" style={{ color: "var(--ink-3)" }}>
          Summary template
        </span>
        <select
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          disabled={busy}
          className="rounded-[var(--radius-sm)] px-2 py-[5px] text-[12.5px]"
          style={{ background: "var(--surface)", color: "var(--ink-2)", border: "1px solid var(--line)" }}
        >
          {TEMPLATES.map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>

        <button
          onClick={run}
          disabled={!file || busy || !allReady}
          className="ml-auto rounded-[var(--radius-sm)] px-4 py-[8px] text-[13px] font-semibold disabled:opacity-40"
          style={{ background: "var(--accent)", color: "var(--on-accent)" }}
        >
          {busy ? "Processing…" : "Transcribe and analyse"}
        </button>
      </div>

      {(log.length > 0 || error) && (
        <div
          className="mt-4 rounded-[var(--radius-lg)] p-4"
          style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
        >
          <div className="mb-2.5 flex items-center gap-2">
            <Steps phase={phase} />
          </div>
          <ul className="flex flex-col gap-1 font-mono text-[12px]" style={{ color: "var(--ink-2)" }}>
            {log.map((l, i) => (
              <li key={i} className="fade-up">
                <span style={{ color: "var(--ok)" }}>✓</span> {l}
              </li>
            ))}
            {busy && (
              <li style={{ color: "var(--ink-faint)" }}>
                <span className="live-dot">●</span> working…
              </li>
            )}
          </ul>

          {error && (
            <div
              className="mt-3 rounded-[var(--radius)] p-2.5 font-mono text-[12px]"
              style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
            >
              {error}
            </div>
          )}

          {phase === "done" && meetingId && (
            <button
              onClick={() => router.push(`/m/${meetingId}`)}
              className="mt-3 rounded-[var(--radius-sm)] px-3.5 py-[8px] text-[13px] font-semibold"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              Open the meeting →
            </button>
          )}
        </div>
      )}

      <p className="mt-5 text-[12px] leading-relaxed" style={{ color: "var(--ink-faint)" }}>
        Three separate server calls, because a serverless function gets 60 seconds and the whole
        chain does not fit in one. Transcription is Deepgram nova-3 with diarization; analysis is
        Claude reading the stored transcript and citing it by segment id. Any citation that
        doesn&rsquo;t resolve to a real segment is dropped rather than rendered.
      </p>
    </div>
  );
}

function Steps({ phase }: { phase: Phase }) {
  const order: Phase[] = ["uploading", "transcribing", "analysing", "done"];
  const labels = ["Store", "Transcribe", "Analyse", "Ready"];
  const at = order.indexOf(phase);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {labels.map((l, i) => {
        const done = at > i || phase === "done";
        const active = at === i && phase !== "done";
        return (
          <Badge key={l} tone={phase === "failed" && active ? "danger" : done ? "ok" : active ? "accent" : "neutral"}>
            {done && <Icon name="check" size={10} />} {l}
          </Badge>
        );
      })}
    </div>
  );
}
