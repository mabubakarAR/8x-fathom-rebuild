# 8x-fathom-rebuild

A rebuild of [Fathom](https://www.fathom.ai), the AI meeting notetaker. Built in a day for the 8x assignment.

> **On naming:** the repository, the npm package and the log `project` field are all `8x-fathom-rebuild`. The words **Fathom Rebuild** in the interface are the product's display name — a wordmark has to read like one, and `8x-fathom-rebuild` in a sidebar would not. There is no third name.

**Agent capture proof:** [CAPTURE-TEST.md](./CAPTURE-TEST.md) · **Every line of the brief, checked:** [BRIEF-CHECK.md](./BRIEF-CHECK.md) · **Product reasoning and cuts:** [PRODUCT-NOTES.md](./PRODUCT-NOTES.md) · **Check it yourself, step by step:** [RUN-THROUGH.md](./RUN-THROUGH.md) · **What's real vs authored:** `/about` in the app

---

## Real, not mocked

Bring a transcript — VTT, SRT, `Name: text`, or plain prose — to [`/import`](./src/app/import). Claude reads it and produces the title, chapters, a templated summary, action items and clips. Then ask it questions and get an answer that can only cite lines that exist.

The rule the whole AI layer is built around: **the model never emits a timestamp.** It is shown the transcript as numbered lines and must cite by index, and every index it returns is checked against the real array on the server. An index that does not resolve is **dropped, never repaired** — guessing the nearest plausible line produces a citation that looks right and points at the wrong words, which is worse than no claim at all.

### The evidence panel

Every notetaker on the market says its summary is "grounded in your transcript". None of them show their working, because showing it means admitting the model sometimes cites a line that does not exist.

Imported meetings get an **Evidence** tab that shows the funnel for that run — claims proposed → claims anchored to a real line → claims discarded — and quotes the discarded ones verbatim, struck through, with the index the model invented and why it failed. On top of that, the summary has an **Evidence toggle** that drops the actual transcript line underneath every bullet, so you can check a claim without leaving the pane or trusting a link.

The drop path is tested without spending an API call:

```bash
npm test     # feeds the validator citations no transcript could satisfy
```

It asserts that a bullet citing line 9001 of a ten-line transcript is thrown away rather than clamped to line 9, that the discarded text survives for the UI to quote, and that `proposed = resolved + dropped`. A validator only ever exercised by well-behaved model output is not a validator.

## The short version

Fathom is very good at the two-person sales call and visibly strains at the eight-person hour-long one. The brief pointed at that case deliberately, so it is what this rebuild is aimed at. Four things follow from it:

**Auto-chaptering.** A 54-minute transcript with no table of contents is a wall. Every meeting is segmented into chapters that appear on the scrubber, in a jump list, and as sticky headers inside the transcript.

**Speaker repair that back-propagates.** The best-corroborated complaint in Fathom's review corpus is misattribution under crosstalk — *"transcription can generate incorrect speaker assignments if you tend to talk fast or talk over each other."* Fixing one line is busywork. Click a name, pick the right person, fix all 61 lines from that voice at once.

**A speaker-lane minimap.** Eight lanes under the scrubber showing who spoke when across the whole hour, with overlapping speech marked in amber. You can see the shape of the meeting — who dominated, where the handoffs are, where four people piled in at once — before reading a word.

**Confidence you can see.** Low-confidence lines are underlined, counted, and filterable. A transcript that hides its own uncertainty is how you end up with a summary built on a misheard number.

## What else is different

| | Fathom | Here |
|---|---|---|
| Summary structure | `{ template_name, markdown_formatted }` — one opaque blob | Structured rows, each bullet carrying its own timestamp anchor |
| Citations | Hyperlinks buried in prose, with a "copy without hyperlinks" toggle | A visible, clickable, exportable part of every bullet |
| Semantic search | Below keyword results, behind a "Find X with AI" link | One ranked list, blended, with the blend exposed |
| AI chat history | *"Not saved… previous search results will be lost"* (their docs) | Threads persist, with citations |
| Transcript export | None. Clipboard copy only | Markdown, WebVTT, SubRip, JSON |
| Empty search result | "No results" | "Searched 625 lines across 9 meetings, including the related words it expanded to" |
| Dark mode | Not found in 20 months of release notes | Yes |
| Cross-meeting action items | Live inside the call they came from | One board, grouped by owner |
| Pre-meeting capture control | Buried in settings; bot sometimes joins anyway | Per-meeting, on the list, with the rule that chose it shown |

## The stack

| Layer | What | Why this one |
|---|---|---|
| Framework | **Next.js 16**, App Router, React Server Components | Server-render the corpus, keep the client bundle to the parts that actually need interactivity |
| UI | **React 19** with the React Compiler lint rules on | The compiler rules caught three of the hydration bugs in this repo before a user could |
| Language | **TypeScript 5**, `strict` | |
| Styling | **Tailwind v4**, OKLCH design tokens, no component library | Every speaker colour is one token; perceptual lightness stays even across hues, which CSS `hsl` cannot promise |
| AI | **`@anthropic-ai/sdk`** → `claude-sonnet-4-5` | Summaries, templates, Ask, the workspace Ask, contradiction judging |
| Transcription | **Deepgram `nova-3`**, `diarize=true&utterances=true` | Whisper has no diarization, and speaker attribution is the thesis of this build |
| Capture | Browser-native: `getDisplayMedia` + `getUserMedia`, mixed via Web Audio, `MediaRecorder`; `webkitSpeechRecognition` for the live pass | No bot, no backend, works on Zoom, Meet and Teams at once |
| Database | **Postgres** (Neon) via `postgres` (porsager) | One `sql.begin` transaction per save; `prepare: false` for the transaction-mode pooler |
| File storage | **`@vercel/blob`**, falling back to a Postgres `bytea` column | Newer Blob stores issue a store id rather than a token; audio should not depend on which |
| Search | Hand-written BM25 + TF-IDF cosine with query expansion | No vector DB. It is ~200 lines, it runs in-process, and it doubles as the retriever for Ask and the contradiction tracker |
| Testing | `node --experimental-strip-types` | 20 assertions on the citation validator, no framework, no API key |
| Hosting | **Vercel** | |

Seven runtime dependencies in total: `next`, `react`, `react-dom`, `@anthropic-ai/sdk`, `@vercel/blob`, `postgres`, `server-only`. No component library, no state manager, no ORM, no vector database, no test framework.

### Two paths through the app, and why

| | Seeded meetings (`/m/…`) | Imported meetings (`/import`) |
|---|---|---|
| Transcript | Authored corpus, deterministic | Your file, parsed |
| Chapters, summary, actions, clips | Authored | Generated by Claude, index-cited, validated |
| Ask | Local retrieval over the corpus | Claude over retrieved lines, citations validated |
| Evidence tab | Not shown — nothing was validated because nothing was generated | Shown |
| Storage | Deterministic seed + `localStorage` overlay | `localStorage` |

The seeded corpus is not a stand-in for the pipeline; it is the thing that makes the *interface* reviewable in thirty seconds without anyone having to upload an hour of audio first. The pipeline is what makes it a product. Both are in the repo and the app says which one you are looking at on every screen.

A seeded meeting deliberately gets the evidence **toggle** but no evidence **tab**: a ledger reading "0 dropped" over hand-written fixtures would be a lie of omission.

### Why the seeded path has no database

Every read is server-rendered from a deterministic seed. Everything a viewer changes — ticking an action item, cutting a clip, fixing a speaker, asking a question — lands in a client-side overlay persisted to `localStorage` and merged over the seed at render time.

This is a deliberate choice, not a corner cut:

1. **A shared mutable demo is one where the third reviewer sees whatever the second one broke.** Per-viewer state means everyone gets the workspace as intended.
2. **Changes still survive a refresh**, which is what "does this feel real" actually requires.
3. **No credential and no cold start** between a reviewer and a working link.

The honest cost: two people don't see each other's edits, and the scope on a share link is honoured by the interface rather than enforced by a server. Share links carry their payload in the URL precisely so sharing still crosses the browser boundary — a clip link ships only that clip's segments, not the whole hour.

### Search

BM25 + TF-IDF cosine similarity with curated query expansion, each normalised to 0..1 before blending so the alpha parameter means something. Runs over every transcript line and every summary bullet.

**Stated plainly, because it matters:** the "meaning" half is sparse retrieval with a hand-curated synonym table, not neural embeddings. It solves the vocabulary-mismatch case Fathom's users complain about — searching *churn risk* finds *cancellation*, *renewal*, *worry* and *switch*, and the UI colour-codes which words were yours and which were expansions. It will not solve true paraphrase with no shared vocabulary. Swapping in real embeddings is an interface change to `semanticScores` and nothing else.

### Capture is real

The brief permits stubbing this. It is not stubbed.

[`/record`](./src/app/record) captures a **real Zoom, Meet or Teams call** from
the browser. `getDisplayMedia({ audio: true })` takes the tab's audio — the
far side of the call — and `getUserMedia` takes your microphone; the two are
mixed through a Web Audio `MediaStreamDestination` and recorded as one track,
with echo cancellation on the mic so the far side isn't captured twice. Two
`AnalyserNode`s drive a two-tone waveform, you above the centre line and the
call below it, so you can see at a glance that both halves are actually
arriving. On stop the mix goes to Deepgram `nova-3` with `diarize=true` and
comes back as separated speakers.

There is no bot and no backend infrastructure, which is the trade: NoteFlow-style
"paste a link, a bot joins" needs a service standing by to dial into meetings,
and in a day that service is a form that doesn't work. Tab capture works today,
on every platform at once, from the machine already in the call.

The live Web Speech API transcript during recording is **microphone-only** —
the browser cannot transcribe the far side — and the page says so while you
record rather than after. Deepgram fills in everyone else on stop.

Alongside it, [`/live`](./src/app/live) streams the authored hour-long call at
8× with a working mid-call highlight, so the capture *experience* is reviewable
without anyone having to set up a call. The boundary detection is copied from
Fathom's, because it is the cleverest thing in their product: pressing
highlight doesn't mark "now", it walks backwards to where the current speaker
started talking. You press the button when you realise it mattered, which is
always a few seconds late.

### It outlives the tab

A recorded or uploaded call is written to Postgres in one transaction —
transcript, speakers, chapters, summary, actions, highlights and the evidence
ledger. The audio goes to Vercel Blob when a store is attached and into a
`bytea` column when one isn't, served back by `/api/calls/<id>/audio` with real
HTTP range support so scrubbing works in Safari.

The test that matters: record something, copy the URL, close the tab, open it
on your phone. `DELETE /api/calls/<id>` removes a call and everything hanging
off it.

## The seed data

Nine meetings, 625 spoken lines, all written for this build — and internally consistent on purpose. The Salesforce date Leah promises in the Kestrel discovery call is the one Rachel has to walk back in the roadmap call. The escalation Helen delivers in the Brightwater review is the one Rachel reads aloud a week later. Cross-meeting search is only worth building if the corpus has threads running through it.

The hero is **Q4 Roadmap Lock** — 54 minutes, 332 segments, 12 chapters, 8 speakers and one attendee who never says a word. It is written to be hostile to a notetaker: overlapping speech, jargon the transcriber fumbles, a late joiner, and a decision that gets made, re-opened and re-made.

Dialogue is authored; the connective tissue is derived. Turn-taking gaps, back-channel, crosstalk and ASR confidence are generated by rule from a deterministic PRNG, so the corpus is byte-identical on every build. Summary, action-item and highlight anchors reference transcript **phrases**, not numbers — so editing a line can never silently detach a citation. It throws at build time instead.

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
npm run typecheck
npm test           # the citation validator's drop path, no API key needed
```

The seeded workspace — every meeting, search, clip and export — runs with **no
environment variables and no database**. Open it and it works.

Everything else degrades one layer at a time rather than breaking, and says
which layer it is on. `/api/setup` reports exactly what this deployment can do:

| Variable | Without it |
|---|---|
| `ANTHROPIC_API_KEY` | `/import`, `/record` and Ask return 503 and say so. The seeded workspace is unaffected |
| `DEEPGRAM_API_KEY` | A recorded call is transcribed from your microphone only, and the page tells you mid-call |
| `DATABASE_URL` | A recording lives in your browser and nowhere else. Every read path checks |
| `BLOB_READ_WRITE_TOKEN` | Audio goes into Postgres instead of object storage. Nothing else changes |

Names, no values, in [`.env.example`](./.env.example).

## Layout

```
src/
  app/                    routes: list (+ upcoming), meeting, record, import, upload,
                          search, commitments, actions, clips, live, about, /s/<token>
                          api/: analyse, transcribe, calls, ask, commitments, setup
  components/
    meeting/              player, transcript, summary, highlights, actions, ask, share, export
  lib/
    seed/                 the corpus — cast, builder, and one file per meeting
    pipeline/             parse → transcribe → analyse → ask; validate.ts is the citation
                          check; ask-workspace.ts answers across every meeting
    commitments/          collect promises, pair them across meetings, judge contradictions
    db/                   schema, one-transaction save, shape-based env detection
    recorder.ts           tab audio + mic, mixed and recorded in the browser
    evidence.ts           the ledger types that travel to the browser
    search/engine.ts      BM25 + cosine, query expansion, blending
    overlay.tsx           the client-side mutation layer
    types.ts              domain model, and why it diverges from Fathom's API
.agent-logs/              every prompt and response from the build, committed as it went
.claude/hooks/            the capture hooks + the transcript backfill safety net
scripts/test-validation.mjs   proves the citation validator actually drops things
```

## What was deliberately left out

CRM sync, deal pipelines, coaching scorecards, real calendar OAuth, auth, billing, third-party integrations, mobile, admin. Some of it is Fathom's actual moat and all of it is downstream of the core loop working. [PRODUCT-NOTES.md](./PRODUCT-NOTES.md) has the reasoning for each cut, the research it came from, and the ranked table of where the original is weak and how confident I am about each one.

The honest near-miss: retroactive trackers. Fathom's *"Trackers do not scan past calls retroactively"* is a backfill-compute limitation rather than a product truth, and it would have been the next thing above the line.
