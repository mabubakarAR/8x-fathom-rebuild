"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAudio } from "@/lib/audio-store";
import { useOverlay } from "@/lib/overlay";
import { getImported, saveImported, toBundle, type ImportedMeeting } from "@/lib/imported";
import { HIGHLIGHT_CATEGORIES, TEMPLATES } from "@/lib/seed/cast";
import { MeetingView } from "./meeting/view";
import { Badge } from "./ui";

// An imported meeting renders through exactly the same MeetingView as a
// seeded one. That is the point of having kept the domain model separate from
// the data source: the transcript, chapters, citations and clips here came out
// of a model reading a real file, and not one line of the meeting UI had to
// know that.

export function ImportedView({ id }: { id: string }) {
  const [m, setM] = useState<ImportedMeeting | null | undefined>(undefined);
  // A recorded meeting has real audio in IndexedDB. Handing MeetingView an
  // object URL is all it takes — the player, the scrubber, the active line
  // and the speaker lanes were already written against a media element.
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  // Which template is being written right now, if any.
  const [generating, setGenerating] = useState<string | null>(null);
  const overlay = useOverlay();

  // Local first, server second.
  //
  // The browser that made the recording has it instantly, so it renders
  // without waiting. Any other browser — a phone, a colleague's laptop, this
  // one after clearing site data — has nothing locally and gets it from the
  // server. That is the whole point of persisting: a link that works for
  // someone who was never here.
  useEffect(() => {
    const local = getImported(id);
    if (local) {
      setM(local);
      return;
    }
    let live = true;
    void (async () => {
      try {
        const res = await fetch(`/api/calls/${id}`);
        if (!res.ok) throw new Error("not found");
        const c = (await res.json()) as {
          id: string;
          startedAt: string;
          templateKey: string;
          transcriptSource: string | null;
          origin: string;
          mediaUrl: string | null;
          segments: ImportedMeeting["segments"];
          speakerNames: Record<string, string>;
          analysis: ImportedMeeting["analysis"];
        };
        if (!live) return;
        setM({
          id: c.id,
          createdAt: c.startedAt,
          templateKey: c.templateKey,
          format:
            (c.origin === "call" ? "call capture" : c.origin === "mic" ? "live recording" : "import") +
            (c.transcriptSource ? ` · ${c.transcriptSource}` : ""),
          warnings: [],
          segments: c.segments,
          speakerNames: c.speakerNames,
          analysis: c.analysis,
        });
        if (c.mediaUrl) setMediaUrl(c.mediaUrl);
      } catch {
        if (live) setM(null);
      }
    })();
    return () => {
      live = false;
    };
  }, [id]);

  useEffect(() => {
    let url: string | null = null;
    let live = true;
    // The local blob wins when it exists: no network, instant scrubbing.
    void getAudio(id).then((blob) => {
      if (!live || !blob) return;
      url = URL.createObjectURL(blob);
      setMediaUrl(url);
    });
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);

  if (m === undefined) {
    return (
      <div className="mx-auto max-w-[760px] px-4 pt-20 text-center text-[13.5px]" style={{ color: "var(--ink-3)" }}>
        Loading…
      </div>
    );
  }

  if (m === null) {
    return (
      <div className="mx-auto max-w-[620px] px-4 pt-20 text-center">
        <h1 className="text-[18px] font-semibold">This call isn&rsquo;t here</h1>
        <p className="mx-auto mt-2 max-w-[48ch] text-[13.5px] leading-relaxed" style={{ color: "var(--ink-3)" }}>
          It isn&rsquo;t in this browser and the server doesn&rsquo;t have it either. Recorded calls
          are saved to the workspace and open anywhere; a transcript imported before the database
          was connected stays in the browser that imported it.
        </p>
        <Link
          href="/import"
          className="mt-4 inline-block rounded-[var(--radius-sm)] px-4 py-[8px] text-[13px] font-semibold"
          style={{ background: "var(--accent)", color: "var(--on-accent)" }}
        >
          Import one
        </Link>
      </div>
    );
  }

  // Generating a template that was never run.
  //
  // Fathom's picker shows sixteen templates whether or not you have used
  // them. Greying fifteen of them out is honest but useless, so on a meeting
  // that went through the model, picking an ungenerated template runs it —
  // a real call over the same transcript, with the same citation validation,
  // stored alongside the original rather than replacing it.
  async function generate(key: string) {
    if (generating || !m) return;
    setGenerating(key);
    try {
      const text = m.segments
        .map(
          (s2) =>
            `${m.speakerNames?.[String(s2.speakerLabel)] ?? `Speaker ${s2.speakerLabel + 1}`}: ${s2.text}`,
        )
        .join("\n");
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, template: key }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not generate that summary");
      const next: ImportedMeeting = {
        ...m,
        extraSections: { ...(m.extraSections ?? {}), [key]: json.analysis.sections },
      };
      saveImported(next);
      setM(next);
      // Switch the pane to what was just written.
      overlay.chooseTemplate(m.id, key);
    } catch {
      // The picker simply stays where it was; nothing is lost.
    } finally {
      setGenerating(null);
    }
  }

  const b = toBundle(m);

  return (
    <>
      <div className="mx-auto w-full max-w-[1480px] px-4 pt-5 md:px-7">
        <div
          className="flex flex-wrap items-center gap-2 rounded-[var(--radius)] px-3 py-2 text-[12px]"
          style={{ background: "var(--ok-soft)", color: "var(--ink-2)" }}
        >
          <Badge tone="ok">{m.format === "live recording" ? "Real recording" : "Real analysis"}</Badge>
          <span>
            {m.format === "live recording" ? "You recorded this. " : ""}
            Chapters, summary, action items and clips below were generated by{" "}
            <strong>{m.analysis.model}</strong> reading this transcript — not written by hand.
            {m.analysis.evidence && (
              <>
                {" "}
                <strong>
                  {m.analysis.evidence.resolved} of {m.analysis.evidence.proposed} claims
                </strong>{" "}
                survived citation checking; the Evidence tab shows the rest.
              </>
            )}
          </span>
          {m.warnings.length > 0 && (
            <span style={{ color: "var(--ink-faint)" }}>· {m.warnings[0]}</span>
          )}
        </div>
      </div>

      <MeetingView
        meeting={b.meeting}
        segments={b.segments}
        chapters={b.chapters}
        summaries={b.summaries}
        actionItems={b.actionItems}
        highlights={b.highlights}
        people={b.people}
        rosterIds={b.people.map((p) => p.id)}
        categories={HIGHLIGHT_CATEGORIES}
        templates={TEMPLATES}
        suggested={[m.templateKey, ...Object.keys(m.extraSections ?? {})]}
        isLive
        askSegments={m.segments}
        askSpeakerNames={m.speakerNames}
        evidence={m.analysis.evidence}
        mediaUrl={mediaUrl}
        onGenerateTemplate={generate}
        generatingTemplate={generating}
      />
    </>
  );
}
