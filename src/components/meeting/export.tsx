"use client";

import { useEffect, useRef, useState } from "react";
import { clock } from "@/lib/format";
import type { MeetingViewProps } from "./view";
import { Icon } from "../ui";

// Export.
//
// Fathom has none of this. Their own help centre: transcripts "can't be
// downloaded directly" — clipboard copy only — and the video download is
// hidden behind an overflow menu. For a product whose entire output is text,
// that is a strange place to draw the line, and it costs about an afternoon to
// beat properly.
//
// Four formats, all generated client-side from data already in the page:
// Markdown for a doc, VTT and SRT for anything that eats subtitles, and JSON
// for a machine.

type Fmt = "md" | "vtt" | "srt" | "json";

const FORMATS: { key: Fmt; label: string; hint: string }[] = [
  { key: "md", label: "Markdown", hint: "Summary, actions and transcript" },
  { key: "vtt", label: "WebVTT", hint: "Timed captions" },
  { key: "srt", label: "SubRip", hint: "Timed captions, legacy" },
  { key: "json", label: "JSON", hint: "Everything, structured" },
];

export function ExportMenu(props: MeetingViewProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function download(fmt: Fmt) {
    const { body, mime, ext } = render(fmt, props);
    const blob = new Blob([body], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug(props.meeting.title)}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-[7px] text-[13px] font-medium"
        style={{ background: "var(--surface)", color: "var(--ink-2)", border: "1px solid var(--line)" }}
      >
        <Icon name="download" size={14} /> Export
      </button>

      {open && (
        <div
          role="menu"
          className="fade-up absolute right-0 z-40 mt-1.5 w-[248px] overflow-hidden rounded-[var(--radius)] p-1"
          style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-lg)" }}
        >
          {FORMATS.map((f) => (
            <button
              key={f.key}
              role="menuitem"
              onClick={() => download(f.key)}
              className="flex w-full flex-col rounded-[var(--radius-sm)] px-2.5 py-2 text-left transition-colors hover:bg-[var(--surface-2)]"
            >
              <span className="text-[13px] font-medium" style={{ color: "var(--ink)" }}>
                {f.label}
              </span>
              <span className="text-[11.5px]" style={{ color: "var(--ink-faint)" }}>
                {f.hint}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

function vttTime(ms: number, comma = false) {
  const t = Math.max(0, ms);
  const h = Math.floor(t / 3600000);
  const m = Math.floor((t % 3600000) / 60000);
  const s = Math.floor((t % 60000) / 1000);
  const f = Math.floor(t % 1000);
  const sep = comma ? "," : ".";
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}${sep}${String(f).padStart(3, "0")}`;
}

function render(fmt: Fmt, p: MeetingViewProps) {
  const name = (id: string) => p.people.find((x) => x.id === id)?.name ?? "Unknown";

  if (fmt === "vtt" || fmt === "srt") {
    const comma = fmt === "srt";
    const cues = p.segments.map((s, i) => {
      const head = comma ? `${i + 1}\n` : "";
      return `${head}${vttTime(s.startMs, comma)} --> ${vttTime(s.endMs, comma)}\n<v ${name(s.speakerId)}>${s.text}`;
    });
    const body = (fmt === "vtt" ? "WEBVTT\n\n" : "") + cues.join("\n\n") + "\n";
    return { body, mime: "text/plain;charset=utf-8", ext: fmt };
  }

  if (fmt === "json") {
    return {
      body: JSON.stringify(
        {
          meeting: p.meeting,
          chapters: p.chapters,
          summaries: p.summaries,
          actionItems: p.actionItems,
          highlights: p.highlights,
          segments: p.segments,
          people: p.people.filter((x) => p.rosterIds.includes(x.id)),
          exportedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
      mime: "application/json",
      ext: "json",
    };
  }

  const s = p.summaries[0];
  const lines: string[] = [
    `# ${p.meeting.title}`,
    ``,
    `${new Date(p.meeting.startedAt).toUTCString()} · ${Math.round(p.meeting.durationMs / 60000)} minutes · ${p.meeting.platform}`,
    ``,
    `**Attendees:** ${p.meeting.participants.map((x) => name(x.personId) + (x.attended ? "" : " (silent)")).join(", ")}`,
    ``,
  ];

  if (s) {
    lines.push(`## Summary — ${s.templateKey}`, ``);
    for (const sec of s.sections) {
      lines.push(`### ${sec.heading}`, ``);
      for (const b of sec.bullets) lines.push(`- ${b.text} _[${clock(b.anchorMs)}]_`);
      lines.push(``);
    }
  }

  if (p.actionItems.length) {
    lines.push(`## Action items`, ``);
    for (const a of p.actionItems) {
      lines.push(
        `- [${a.done ? "x" : " "}] ${a.text}${a.assigneeId ? ` — **${name(a.assigneeId)}**` : ""}${a.dueHint ? ` (${a.dueHint})` : ""} _[${clock(a.anchorMs)}]_`,
      );
    }
    lines.push(``);
  }

  if (p.highlights.length) {
    lines.push(`## Clips`, ``);
    for (const h of p.highlights)
      lines.push(`- **${h.title}** — ${h.categoryKey}, _[${clock(h.startMs)}–${clock(h.endMs)}]_`);
    lines.push(``);
  }

  lines.push(`## Transcript`, ``);
  let currentChapter = "";
  for (const seg of p.segments) {
    const ch = p.chapters.find((c) => seg.startMs >= c.startMs && seg.startMs <= c.endMs);
    if (ch && ch.title !== currentChapter) {
      currentChapter = ch.title;
      lines.push(``, `### ${ch.title}`, ``);
    }
    lines.push(`**${name(seg.speakerId)}** _[${clock(seg.startMs)}]_ — ${seg.text}`, ``);
  }

  return { body: lines.join("\n"), mime: "text/markdown;charset=utf-8", ext: "md" };
}
