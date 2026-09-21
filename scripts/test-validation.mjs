// Does the citation validator actually drop things?
//
// The evidence panel is only worth anything if the drop path runs. In normal
// operation the model behaves and the ledger reads "0 dropped", which proves
// nothing — so this feeds the validator a payload full of citations no
// transcript could satisfy and asserts each one is thrown away, with the
// invented index preserved for the UI to quote.
//
//   node --experimental-strip-types scripts/test-validation.mjs
//
// No API key, no network, no cost.

import assert from "node:assert/strict";
import { validateAnalysis } from "../src/lib/pipeline/validate.ts";

const SEGMENTS = 10; // valid indices are 0..9

const payload = {
  title: "A meeting",
  gist: "Something happened.",
  speakerNames: { 0: "Priya", 1: "  ", 2: "Marcus" },
  chapters: [
    { title: "Opening", gist: "kickoff", startIdx: 0 },
    { title: "Ghost chapter", gist: "cites past the end", startIdx: 47 },
    { title: "Duplicate start", gist: "same line as opening", startIdx: 0 },
    { title: "No index at all", gist: "", startIdx: null },
  ],
  sections: [
    {
      heading: "Decisions",
      bullets: [
        { text: "Migration moved to the 28th", segmentIdx: 3 },
        { text: "Invented: budget approved at 200k", segmentIdx: 9001 },
        { text: "Negative index", segmentIdx: -4 },
        { text: "Index as a string", segmentIdx: "5" },
        { text: "   ", segmentIdx: 2 },
      ],
    },
  ],
  actions: [
    { text: "Marcus owns the cutover", speakerLabel: 1, segmentIdx: 8 },
    { text: "Hallucinated follow-up", speakerLabel: 0, segmentIdx: 12 },
  ],
  highlights: [
    { title: "Real clip", categoryKey: "decision", startIdx: 4, endIdx: 6 },
    { title: "Clip off the end", categoryKey: "risk", startIdx: 99, endIdx: 120 },
    { title: "End before start", categoryKey: "nonsense-category", startIdx: 7, endIdx: 2 },
  ],
};

const a = validateAnalysis(payload, SEGMENTS, 1234, "test");
const e = a.evidence;

const show = (label, ok) => {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}`);
  if (!ok) process.exitCode = 1;
};

console.log(`\nvalidateAnalysis over a ${SEGMENTS}-line transcript (valid indices 0-9)\n`);

// --- what survived ---------------------------------------------------------
show("keeps the chapter citing line 0", a.chapters.some((c) => c.title === "Opening"));
show("keeps the bullet citing line 3", a.sections[0].bullets.some((b) => b.segmentIdx === 3));
show("keeps the action citing line 8", a.actions.length === 1 && a.actions[0].segmentIdx === 8);
show("keeps the clip citing lines 4-6", a.highlights.some((h) => h.startIdx === 4 && h.endIdx === 6));

// --- what was thrown away --------------------------------------------------
const by = (kind) => e.dropped.filter((d) => d.kind === kind);
show("drops the chapter citing line 47", by("chapter").some((d) => d.citedIdx === 47));
show("drops the duplicate-start chapter", by("chapter").some((d) => d.reason.includes("duplicate")));
show("drops the chapter with no index", by("chapter").some((d) => d.citedIdx === null));
show("drops the bullet citing line 9001", by("bullet").some((d) => d.citedIdx === 9001));
show("drops the bullet citing line -4", by("bullet").some((d) => d.citedIdx === -4));
show('drops the bullet whose index is the string "5"', by("bullet").some((d) => d.text.includes("string")));
show("drops the empty bullet", by("bullet").some((d) => d.reason === "empty claim"));
show("drops the action citing line 12", by("action").some((d) => d.citedIdx === 12));
show("drops the clip citing line 99", by("highlight").some((d) => d.citedIdx === 99));

// --- the ledger itself -----------------------------------------------------
show("dropped text is preserved verbatim for the UI",
  e.dropped.every((d) => typeof d.text === "string" && d.text.length > 0));
show("every drop carries a human-readable reason",
  e.dropped.every((d) => typeof d.reason === "string" && d.reason.length > 4));
show("proposed = resolved + dropped", e.proposed === e.resolved + e.dropped.length);
show("resolved matches what is actually rendered",
  e.resolved ===
    a.chapters.length +
      a.sections.reduce((n, s) => n + s.bullets.length, 0) +
      a.actions.length +
      a.highlights.length);

// --- repair-free guarantees ------------------------------------------------
show("no surviving claim points past the end of the transcript",
  [...a.chapters.map((c) => c.startIdx),
   ...a.sections.flatMap((s) => s.bullets.map((b) => b.segmentIdx)),
   ...a.actions.map((x) => x.segmentIdx),
   ...a.highlights.flatMap((h) => [h.startIdx, h.endIdx]),
  ].every((i) => Number.isInteger(i) && i >= 0 && i < SEGMENTS));
show("an unknown highlight category falls back rather than rendering raw",
  a.highlights.every((h) => ["decision","risk","quote","objection","followup","idea"].includes(h.categoryKey)));
show("a blank speaker name is not stored", !Object.values(a.speakerNames).some((v) => !v.trim()));

console.log(`\n${e.proposed} proposed → ${e.resolved} anchored → ${e.dropped.length} discarded\n`);
for (const d of e.dropped) {
  console.log(`  ✗ [${d.kind}] ${JSON.stringify(d.text.slice(0, 48))} — ${d.reason}`);
}
console.log(process.exitCode ? "\nFAILED\n" : "\nAll assertions passed.\n");
assert.ok(!process.exitCode);
