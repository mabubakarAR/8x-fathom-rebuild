"use client";

import { useMemo, useState } from "react";
import { useOverlay } from "@/lib/overlay";
import { clock, duration } from "@/lib/format";
import type { Meeting, Participant, Person, Segment, Summary, Template } from "@/lib/types";
import { Avatar, Icon, SectionLabel, TalkBar, speakerVar } from "../ui";
import { TemplatePicker } from "../template-picker";

// The summary pane.
//
// Fathom stores a summary as { template_name, markdown_formatted } — one
// opaque blob — which is why the only citation it can offer is a hyperlink
// buried in prose, and why it ships a "copy with or without the hyperlinks"
// toggle. Here every bullet is a row with its own anchor, so the citation is
// a first-class object: clickable, countable, exportable, and impossible to
// lose when the text is copied.

interface Props {
  meeting: Meeting;
  summaries: Summary[];
  templates: Template[];
  suggested: string[];
  people: Map<string, Person>;
  currentMs: number;
  onSeek: (ms: number, opts?: { play?: boolean }) => void;
  speakers: { part: Participant; person: Person }[];
  /** Used by evidence mode to show the line each claim is standing on. */
  segments: Segment[];
  /** Real meetings can generate a template that has not been run yet. */
  onGenerate?: (key: string) => void;
  generating?: string | null;
}

export function SummaryPane({
  meeting,
  summaries,
  templates,
  suggested,
  people,
  currentMs,
  onSeek,
  speakers,
  segments,
  onGenerate,
  generating,
}: Props) {
  const overlay = useOverlay();
  const available = summaries.map((s) => s.templateKey);
  const chosen = overlay.state.templateChoice[meeting.id];
  const activeKey = available.includes(chosen as never) ? chosen : available[0];
  const summary = summaries.find((s) => s.templateKey === activeKey) ?? summaries[0];
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  // Evidence mode. Off by default because most of the time you want to read
  // the summary; on, every claim carries the transcript line it was derived
  // from, so you can check it without leaving the pane or trusting a link.
  const [evidence, setEvidence] = useState(false);

  const ordered = useMemo(() => {
    const rank = new Map(suggested.map((k, i) => [k, i]));
    return [...templates].sort(
      (a, b) => (rank.get(a.key) ?? 99) - (rank.get(b.key) ?? 99),
    );
  }, [templates, suggested]);

  // Resolve a bullet's anchor back to the line it came from. The anchor is a
  // timestamp rather than a foreign key in the seed path, so the last segment
  // starting at or before the anchor is the line — the same rule the
  // transcript uses to decide which line is active.
  const lineAt = useMemo(() => {
    const sorted = [...segments].sort((a, b) => a.startMs - b.startMs);
    return (ms: number): Segment | undefined => {
      let lo = 0, hi = sorted.length - 1, found: Segment | undefined;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (sorted[mid].startMs <= ms + 1) { found = sorted[mid]; lo = mid + 1; }
        else hi = mid - 1;
      }
      return found;
    };
  }, [segments]);

  const totalTalk = speakers.reduce((a, s) => a + s.part.talkMs, 0);
  const citationCount = summary.sections.reduce((a, s) => a + s.bullets.length, 0);

  function switchTemplate(key: string) {
    if (key === activeKey) return;
    overlay.chooseTemplate(meeting.id, key);
    // A visible regeneration beat. The summary really is different per
    // template — different sections, different bullets — so the pause is
    // representing work rather than faking it.
    setRegenerating(true);
    setTimeout(() => setRegenerating(false), 520);
  }

  async function copyAll() {
    const text =
      `${meeting.title}\n${summary.sections
        .map(
          (sec) =>
            `\n## ${sec.heading}\n` +
            sec.bullets.map((b) => `- ${b.text}  [${clock(b.anchorMs)}]`).join("\n"),
        )
        .join("\n")}\n`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the export menu is the fallback */
    }
  }

  return (
    <div className="p-3.5">
      {/* template switcher */}
      <div className="mb-3">
        <div className="mb-1.5 flex items-center justify-between">
          <SectionLabel>Template</SectionLabel>
          <div className="flex items-center gap-3">
          <button
            onClick={() => setEvidence((v) => !v)}
            aria-pressed={evidence}
            title="Show the transcript line behind every claim"
            className="flex items-center gap-1 text-[11.5px] font-medium"
            style={{ color: evidence ? "var(--accent-ink)" : "var(--ink-3)" }}
          >
            <Icon name={evidence ? "eye" : "eye-off"} size={12} />
            Evidence
          </button>
          <button
            onClick={copyAll}
            className="flex items-center gap-1 text-[11.5px] font-medium"
            style={{ color: copied ? "var(--ok)" : "var(--ink-3)" }}
          >
            <Icon name={copied ? "check" : "copy"} size={12} />
            {copied ? "Copied" : "Copy"}
          </button>
          </div>
        </div>
        <TemplatePicker
          templates={ordered}
          available={available}
          activeKey={activeKey}
          suggested={suggested}
          onPick={switchTemplate}
          onGenerate={onGenerate}
          generating={generating}
        />
      </div>

      {/* stats strip */}
      <div
        className="mb-3 rounded-[var(--radius)] p-2.5"
        style={{ background: "var(--surface-2)" }}
      >
        <div className="mb-1.5 flex items-center justify-between text-[11px]" style={{ color: "var(--ink-3)" }}>
          <span>Talk time</span>
          <span className="tnum">{duration(meeting.durationMs)}</span>
        </div>
        <TalkBar rows={speakers.map((s) => ({ person: s.person, ms: s.part.talkMs }))} totalMs={totalTalk} />
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {speakers.slice(0, 4).map(({ person, part }) => (
            <span key={person.id} className="flex items-center gap-1 text-[11px]" style={{ color: "var(--ink-3)" }}>
              <span className="h-2 w-2 rounded-full" style={{ background: speakerVar(person.hue) }} />
              {person.name.split(" ")[0]}{" "}
              <span className="tnum" style={{ color: "var(--ink-faint)" }}>
                {totalTalk ? Math.round((part.talkMs / totalTalk) * 100) : 0}%
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* sections */}
      <div
        style={{
          opacity: regenerating ? 0.35 : 1,
          transition: "opacity .18s",
        }}
      >
        {regenerating && (
          <p className="mb-2 text-[12px]" style={{ color: "var(--accent-ink)" }}>
            Regenerating with the {templates.find((t) => t.key === activeKey)?.label} template…
          </p>
        )}

        {summary.sections.map((sec) => (
          <section key={sec.id} className="mb-4">
            <h3 className="mb-1.5 text-[12.5px] font-semibold" style={{ color: "var(--ink)" }}>
              {sec.heading}
            </h3>
            <ul className="flex flex-col gap-1.5">
              {sec.bullets.map((b) => {
                const person = b.speakerId ? people.get(b.speakerId) : undefined;
                const near = Math.abs(currentMs - b.anchorMs) < 12000;
                return (
                  <li key={b.id}>
                    <button
                      onClick={() => onSeek(b.anchorMs, { play: true })}
                      className="group flex w-full gap-2 rounded-[var(--radius-sm)] p-1.5 text-left transition-colors"
                      style={{ background: near ? "var(--accent-soft)" : "transparent" }}
                    >
                      <span
                        className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: person ? speakerVar(person.hue) : "var(--ink-faint)" }}
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className="block text-[13px] leading-[1.55]"
                          style={{ color: "var(--ink-2)" }}
                        >
                          {b.text}
                        </span>
                        {/* The citation. Not a hyperlink hidden in prose — a
                            visible, structural part of the bullet. */}
                        <span className="mt-0.5 flex items-center gap-1.5 text-[11px]" style={{ color: "var(--ink-faint)" }}>
                          {person && <Avatar person={person} size={13} />}
                          {person && <span>{person.name.split(" ")[0]}</span>}
                          <span className="tnum group-hover:underline" style={{ color: "var(--accent-ink)" }}>
                            {clock(b.anchorMs)}
                          </span>
                        </span>
                      </span>
                    </button>
                    {evidence && <Receipt line={lineAt(b.anchorMs)} people={people} />}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-1 text-[11px] leading-relaxed" style={{ color: "var(--ink-faint)" }}>
        {citationCount} claims, every one anchored to a moment in the recording. Click any bullet to
        jump there{evidence ? ", or read the line it came from underneath it" : ""}.
      </p>
    </div>
  );
}

/** The line a claim is standing on, shown inline in evidence mode. */
function Receipt({ line, people }: { line?: { text: string; speakerId: string }; people: Map<string, Person> }) {
  if (!line) {
    return (
      <p
        className="ml-3.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-[11.5px]"
        style={{ background: "var(--warn-soft)", color: "var(--warn-ink)" }}
      >
        No transcript line resolves to this anchor — this claim would have been dropped by the
        pipeline.
      </p>
    );
  }
  const person = people.get(line.speakerId);
  return (
    <blockquote
      className="ml-3.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-[11.5px] leading-[1.55]"
      style={{
        background: "var(--surface-2)",
        color: "var(--ink-3)",
        borderLeft: `2px solid ${person ? speakerVar(person.hue) : "var(--line-strong)"}`,
      }}
    >
      {person && <span className="font-medium" style={{ color: "var(--ink-2)" }}>{person.name.split(" ")[0]}: </span>}
      &ldquo;{line.text}&rdquo;
    </blockquote>
  );
}
