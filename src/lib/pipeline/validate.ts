import type { Analysis, AnalysedAction, AnalysedChapter, AnalysedHighlight, AnalysedSection } from "./analyse";
import type { DroppedClaim } from "../evidence";

// Validation, kept in its own module with no server-only import and no SDK
// dependency, so it can be run straight from node — see
// `scripts/test-validation.mjs`. A validator that has only ever been exercised
// by well-behaved model output is not a validator.

const CATEGORIES = ["decision", "risk", "quote", "objection", "followup", "idea"];

const clampIdx = (n: unknown, max: number): number | null => {
  const i = typeof n === "number" ? Math.round(n) : Number.NaN;
  return Number.isFinite(i) && i >= 0 && i <= max ? i : null;
};

/** Whatever the model actually said, valid or not — so the ledger can quote it. */
const rawIdx = (n: unknown): number | null =>
  typeof n === "number" && Number.isFinite(n) ? Math.round(n) : null;

/**
 * Turn whatever the model said into an Analysis, dropping anything that does
 * not resolve to a real transcript line, and recording every drop.
 *
 * Exported and pure so the drop path can be tested without spending an API
 * call — see `scripts/test-validation.mjs`. A validator that has only ever
 * been exercised by well-behaved model output is not a validator.
 */
export function validateAnalysis(
  parsed: Record<string, unknown>,
  segmentCount: number,
  elapsedMs: number,
  model = "unknown",
): Analysis {
  const maxIdx = segmentCount - 1;

  // ---- validation ---------------------------------------------------------
  // Everything below drops rather than repairs. A citation pointing at a
  // segment that does not exist is the exact failure this build is trying not
  // to have, so it never reaches the UI. Every drop is recorded, because a
  // silent drop is indistinguishable from the model never having said it.

  const dropped: DroppedClaim[] = [];
  let proposed = 0;
  const drop = (
    kind: DroppedClaim["kind"],
    where: string,
    text: unknown,
    cited: unknown,
    reason: string,
  ) => {
    dropped.push({
      kind,
      where,
      text: typeof text === "string" && text.trim() ? text.trim().slice(0, 200) : "(no text)",
      citedIdx: rawIdx(cited),
      reason,
    });
  };

  const speakerNames: Record<string, string> = {};
  const rawNames = (parsed.speakerNames ?? {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(rawNames)) {
    if (typeof v === "string" && v.trim()) speakerNames[k] = v.trim().slice(0, 60);
  }

  const chapters: AnalysedChapter[] = ((parsed.chapters as unknown[]) ?? [])
    .flatMap((c) => {
      proposed++;
      const o = c as Record<string, unknown>;
      const idx = clampIdx(o.startIdx, maxIdx);
      if (typeof o.title !== "string") {
        drop("chapter", "Chapters", o.title, o.startIdx, "no title");
        return [];
      }
      if (idx === null) {
        drop("chapter", "Chapters", o.title, o.startIdx, outOfRange(o.startIdx, maxIdx));
        return [];
      }
      return [{
        title: o.title.slice(0, 120),
        gist: typeof o.gist === "string" ? o.gist.slice(0, 300) : "",
        startIdx: idx,
      }];
    })
    .sort((a, b) => a.startIdx - b.startIdx);

  // Deduplicate chapters that start on the same line.
  const seenStart = new Set<number>();
  const uniqueChapters = chapters.filter((c) => {
    if (seenStart.has(c.startIdx)) {
      drop("chapter", "Chapters", c.title, c.startIdx, "duplicate start line");
      return false;
    }
    seenStart.add(c.startIdx);
    return true;
  });
  if (uniqueChapters.length && uniqueChapters[0].startIdx !== 0) {
    uniqueChapters[0] = { ...uniqueChapters[0], startIdx: 0 };
  }

  const outSections: AnalysedSection[] = ((parsed.sections as unknown[]) ?? [])
    .flatMap((s) => {
      const o = s as Record<string, unknown>;
      if (typeof o.heading !== "string") return [];
      const heading = o.heading;
      const bullets = ((o.bullets as unknown[]) ?? []).flatMap((b) => {
        proposed++;
        const bo = b as Record<string, unknown>;
        const idx = clampIdx(bo.segmentIdx, maxIdx);
        if (typeof bo.text !== "string" || !bo.text.trim()) {
          drop("bullet", heading, bo.text, bo.segmentIdx, "empty claim");
          return [];
        }
        if (idx === null) {
          drop("bullet", heading, bo.text, bo.segmentIdx, outOfRange(bo.segmentIdx, maxIdx));
          return [];
        }
        return [{ text: bo.text.trim(), segmentIdx: idx }];
      });
      return [{ heading, bullets }];
    });

  const actions: AnalysedAction[] = ((parsed.actions as unknown[]) ?? [])
    .flatMap((a) => {
      proposed++;
      const o = a as Record<string, unknown>;
      const idx = clampIdx(o.segmentIdx, maxIdx);
      if (typeof o.text !== "string" || !o.text.trim()) {
        drop("action", "Action items", o.text, o.segmentIdx, "empty task");
        return [];
      }
      if (idx === null) {
        drop("action", "Action items", o.text, o.segmentIdx, outOfRange(o.segmentIdx, maxIdx));
        return [];
      }
      const label =
        typeof o.speakerLabel === "number" ? Math.round(o.speakerLabel) : null;
      return [{
        text: o.text.trim(),
        speakerLabel: label,
        segmentIdx: idx,
        dueHint: typeof o.dueHint === "string" && o.dueHint.trim() ? o.dueHint.trim() : undefined,
      }];
    });

  const highlights: AnalysedHighlight[] = ((parsed.highlights as unknown[]) ?? [])
    .flatMap((h) => {
      proposed++;
      const o = h as Record<string, unknown>;
      const a = clampIdx(o.startIdx, maxIdx);
      const b = clampIdx(o.endIdx, maxIdx);
      if (typeof o.title !== "string") {
        drop("highlight", "Highlights", o.title, o.startIdx, "no title");
        return [];
      }
      if (a === null) {
        drop("highlight", "Highlights", o.title, o.startIdx, outOfRange(o.startIdx, maxIdx));
        return [];
      }
      const end = b === null || b < a ? a : b;
      const cat = typeof o.categoryKey === "string" && CATEGORIES.includes(o.categoryKey)
        ? o.categoryKey
        : "quote";
      return [{
        title: o.title.slice(0, 140),
        categoryKey: cat,
        startIdx: a,
        endIdx: end,
        note: typeof o.note === "string" && o.note.trim() ? o.note.trim().slice(0, 300) : undefined,
      }];
    });

  const resolved =
    uniqueChapters.length +
    outSections.reduce((n, s) => n + s.bullets.length, 0) +
    actions.length +
    highlights.length;

  return {
    title: typeof parsed.title === "string" && parsed.title.trim()
      ? parsed.title.trim().slice(0, 140)
      : "Untitled recording",
    gist: typeof parsed.gist === "string" ? parsed.gist.trim().slice(0, 400) : "",
    speakerNames,
    chapters: uniqueChapters,
    sections: outSections,
    actions,
    highlights,
    model,
    evidence: {
      model,
      segmentCount,
      maxIdx,
      proposed,
      resolved,
      dropped,
      elapsedMs,
    },
  };
}

function outOfRange(cited: unknown, maxIdx: number): string {
  const i = rawIdx(cited);
  if (i === null) return "cited no line at all";
  return `cited line ${i}, which does not exist (transcript ends at ${maxIdx})`;
}
