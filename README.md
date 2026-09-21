# 8x-fathom-rebuild

A rebuild of [Fathom](https://www.fathom.ai), the AI meeting notetaker. Built in a day for the 8x assignment.

> **On naming:** the repository, the npm package and the log `project` field are all `8x-fathom-rebuild`. The words **Fathom Rebuild** in the interface are the product's display name — a wordmark has to read like one, and `8x-fathom-rebuild` in a sidebar would not. There is no third name.

**Agent capture proof:** [CAPTURE-TEST.md](./CAPTURE-TEST.md) · **Every line of the brief, checked:** [BRIEF-CHECK.md](./BRIEF-CHECK.md) · **Product reasoning and cuts:** [PRODUCT-NOTES.md](./PRODUCT-NOTES.md) · **Walkthrough script:** [WALKTHROUGH.md](./WALKTHROUGH.md) · **What's real vs simulated:** `/about` in the app

---

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

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · no database.

### Why there is no database

Every read is server-rendered from a deterministic seed. Everything a viewer changes — ticking an action item, cutting a clip, fixing a speaker, asking a question — lands in a client-side overlay persisted to `localStorage` and merged over the seed at render time.

This is a deliberate choice, not a corner cut:

1. **A shared mutable demo is one where the third reviewer sees whatever the second one broke.** Per-viewer state means everyone gets the workspace as intended.
2. **Changes still survive a refresh**, which is what "does this feel real" actually requires.
3. **No credential and no cold start** between a reviewer and a working link.

The honest cost: two people don't see each other's edits, and the scope on a share link is honoured by the interface rather than enforced by a server. Share links carry their payload in the URL precisely so sharing still crosses the browser boundary — a clip link ships only that clip's segments, not the whole hour.

### Search

BM25 + TF-IDF cosine similarity with curated query expansion, each normalised to 0..1 before blending so the alpha parameter means something. Runs over every transcript line and every summary bullet.

**Stated plainly, because it matters:** the "meaning" half is sparse retrieval with a hand-curated synonym table, not neural embeddings. It solves the vocabulary-mismatch case Fathom's users complain about — searching *churn risk* finds *cancellation*, *renewal*, *worry* and *switch*, and the UI colour-codes which words were yours and which were expansions. It will not solve true paraphrase with no shared vocabulary. Swapping in real embeddings is an interface change to `semanticScores` and nothing else.

### The capture layer is simulated

The brief permits this explicitly and it is where an entire day would otherwise have gone. No bot joins a meeting, no audio is captured, and there is no media file — the player is a clock running over the transcript's own timeline. Everything downstream reads `currentMs` exactly as it would from a `<video>`, so swapping in a real element is a one-hook change.

Stubbing capture should not mean stubbing the *experience* of capture, though, so [`/live`](./src/app/live/page.tsx) streams the hour-long call at 8× with a working mid-call highlight. The boundary detection is copied from Fathom's, because it is the cleverest thing in their product: pressing highlight doesn't mark "now", it walks backwards to where the current speaker started talking. You press the button when you realise it mattered, which is always a few seconds late.

## The seed data

Nine meetings, 625 spoken lines, all written for this build — and internally consistent on purpose. The Salesforce date Leah promises in the Kestrel discovery call is the one Rachel has to walk back in the roadmap call. The escalation Helen delivers in the Brightwater review is the one Rachel reads aloud a week later. Cross-meeting search is only worth building if the corpus has threads running through it.

The hero is **Q4 Roadmap Lock** — 54 minutes, 332 segments, 12 chapters, 8 speakers and one attendee who never says a word. It is written to be hostile to a notetaker: overlapping speech, jargon the transcriber fumbles, a late joiner, and a decision that gets made, re-opened and re-made.

Dialogue is authored; the connective tissue is derived. Turn-taking gaps, back-channel, crosstalk and ASR confidence are generated by rule from a deterministic PRNG, so the corpus is byte-identical on every build. Summary, action-item and highlight anchors reference transcript **phrases**, not numbers — so editing a line can never silently detach a citation. It throws at build time instead.

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static where possible, 18 routes
npm run typecheck
```

No environment variables. No database to provision.

## Layout

```
src/
  app/                    routes: list (+ upcoming), meeting, search, actions, clips, live,
                          about, /s/<token>
  components/
    meeting/              player, transcript, summary, highlights, actions, ask, share, export
  lib/
    seed/                 the corpus — cast, builder, and one file per meeting
    search/engine.ts      BM25 + cosine, query expansion, blending
    overlay.tsx           the client-side mutation layer
    types.ts              domain model, and why it diverges from Fathom's API
.agent-logs/              every prompt and response from the build, committed as it went
.claude/hooks/            the capture hooks + the transcript backfill safety net
```

## What was deliberately left out

CRM sync, deal pipelines, coaching scorecards, real calendar OAuth, auth, billing, third-party integrations, mobile, admin. Some of it is Fathom's actual moat and all of it is downstream of the core loop working. [PRODUCT-NOTES.md](./PRODUCT-NOTES.md) has the reasoning for each cut, the research it came from, and the ranked table of where the original is weak and how confident I am about each one.

The honest near-miss: retroactive trackers. Fathom's *"Trackers do not scan past calls retroactively"* is a backfill-compute limitation rather than a product truth, and it would have been the next thing above the line.
