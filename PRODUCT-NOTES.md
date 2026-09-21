# Product notes — rebuilding Fathom

What I found, what I decided to build, and what I deliberately did not.

---

## Recon: how I did it, and what I could not do

Three parallel research passes over fathom.video / fathom.ai, the full help centre (~40 articles), the public API's OpenAPI schema, the pricing page, release notes back to early 2025, and G2/Capterra reviews for the *correct* product.

**What I could not do, stated up front:** I did not sign up. Fathom's sign-in is Google/Microsoft SSO only, and consumer-domain signups are gated behind "you must have a video meeting scheduled in the next seven days". Running a real two-minute Zoom call with myself was not something I could do from a cloud container. So the recon is documentary, not experiential — help centre, API schema and review corpus rather than screenshots of my own account. Where that left a gap I have flagged it below rather than papering over it.

Three research traps worth recording, because they cost real time:

1. **`fathom.video` now 302s to `www.fathom.ai`.** Marketing rebranded; the app and help centre did not.
2. **There are three unrelated products called Fathom.** `g2.com/products/fathom` is financial-reporting software. The notetaker is `g2.com/products/fathom-video`. A lot of published "Fathom reviews" cite the wrong one.
3. **Fathom is mid-migration between two product generations.** "Fathom 3.0" (bot-free, April 2026) is feature-*regressed* against the legacy bot experience: in-meeting highlights don't exist there, post-meeting clips are "coming soon", summary customisation is web-app-only. Rebuilding "what Fathom does" means picking which Fathom.

### The single most useful thing recon turned up

Fathom's public API schema. `MeetingSummary` is `{ template_name, markdown_formatted }` — **the summary is an opaque markdown blob**. Transcript items are `{ speaker, text, timestamp }` — **turn-level, no word-level timing**. Action items carry `HH:MM:SS` strings; highlights carry float seconds — **two timestamp conventions in one API**.

That tells you where the product's ceiling is. A summary that is a markdown blob cannot have addressable, individually-citable sections. It can only have hyperlinks embedded in prose — which is exactly why Fathom ships a "copy summary with or without the hyperlinks" toggle. Structuring the summary as real data is a place to genuinely exceed the original, not just restyle it.

---

## The case that actually matters: 8 people, 60 minutes

The brief points at this deliberately, and it is where the evidence is sharpest.

**What breaks, corroborated across G2 and Capterra in near-identical language:**

- *"It does not always get everything exactly right, especially if people are talking over each other"*
- *"Transcription can generate incorrect speaker assignments if you tend to talk fast or talk over each other"*
- *"Occasionally struggles with capturing voices accurately when multiple people speak at the same time"*
- Accents named explicitly (British, Nigerian); technical jargon; G2 aggregate buckets of 249 reviews on attribution and 258 on transcript accuracy

**Crosstalk scales superlinearly with participant count.** Fathom's 5.0★ comes from 1:1s and two-person sales calls. The 8-person call is precisely where the product's median experience stops matching its rating.

**And the mitigations don't address it.** The Transcription Dictionary (50 terms, ≤6 words each) fixes *vocabulary*, not *diarization*. The only real escape hatch is manual transcript editing — and one reviewer praising transcripts as *"very easy to manually edit"* is itself evidence that people have to.

**What I could not confirm, and it matters:** whether Fathom auto-generates chapters or topic segmentation. No mention in the help centre, the quick start, the marketing site or release notes. Absence from docs is weak evidence, but a 60-minute transcript with no chaptering, no minimap, no speaker filter, and only user-authored highlights as a table of contents is a navigation problem that gets worse every minute.

**So the two things I build for the hard case:**

1. **Auto-chaptering.** Topic segmentation over the transcript, rendered as markers on the scrubber and as a jump list. The answer to "here is an hour of eight people, find the bit about pricing."
2. **Speaker repair that back-propagates.** Click a misattributed speaker, reassign, and have it fix every other instance of that voice in the call. One correction, not two hundred.

---

## Where the original is weak — ranked by how confident I am

| # | Weakness | Evidence strength | Building it? |
|---|---|---|---|
| 1 | Diarization on 4+ person calls | **Strong** — corroborated, two sites, named failure mode | ✅ repair UI |
| 2 | No auto-chaptering on long calls | **Medium** — absent from all docs, not disproven | ✅ core feature |
| 3 | Summary is an opaque markdown blob | **Strong** — their own API schema | ✅ structured + cited |
| 4 | AI chat history discarded on navigate | **Strong** — their own docs say so verbatim | ✅ persisted threads |
| 5 | No transcript export at all, clipboard only | **Strong** — their own docs | ✅ MD / VTT / SRT / JSON |
| 6 | Semantic search is second-class, below keyword results behind "Find X with AI" | **Strong** — documented UI | ✅ blended by default |
| 7 | No arbitrary timestamp-range sharing; clips snap to transcript lines | **Strong** | ✅ real range selection |
| 8 | Screen-reader accessibility broken, unlabeled elements | **Medium** — one detailed blind-user review | ✅ keyboard + a11y pass |
| 9 | No dark mode in 20 months of release notes | **Medium** — absence of evidence | ✅ free win, suits the brand |
| 10 | Low-information list rows: title + icons only | **Strong** | ✅ dense rows with gist |
| 11 | Trackers don't scan retroactively | Strong | ❌ out of scope |
| 12 | One meeting at a time; Slack private channels unsupported | Strong | ❌ infra, not UI |

---

## What I'm building, in priority order

The ranking is the product judgement. Everything above the line ships; everything below is explicitly cut.

**1. The meeting page — transcript as the primary surface**

Fathom's best idea, and I'm keeping it: *the transcript is the editing timeline, not the video scrubber.* You trim from the transcript. You highlight from the transcript. The blue `+` in the left gutter on hover, then drag to extend the range over adjacent lines — that is a genuinely good interaction and I am copying it close to verbatim.

What I add: click-to-seek both ways, auto-scroll with an active-line marker during playback, and a **transcript minimap** down the edge showing speaker bands — so an hour of eight people has a shape you can see before you read it.

**2. Auto-chapters + scrubber markers**

Topic segments computed over the transcript, shown as a jump list and as ticks on the timeline alongside highlight markers. This is the headline answer to the eight-person hour.

**3. Structured, citable summaries with switchable templates**

Templates switchable after the fact with regeneration, same as the original. But the summary is **structured data, not a markdown blob**: each bullet is a row with its own `start_ms`, so every claim in the summary is a real link to the moment that produced it — clickable, hoverable, exportable. Fathom embeds hyperlinks in prose and offers to strip them; I make the citation the primary key.

**4. Action items with assignees, completion, and provenance**

Per-person, checkable, each anchored to the moment it was committed to. Manually addable. This is close to parity with the original — it is already good.

**5. Speaker repair**

Inline reassignment that back-propagates across the whole call, with a confidence indicator on segments the model was unsure about. Directly targets the best-evidenced weakness.

**6. Highlights → clips → public sharing**

Typed, coloured highlight categories. A clip is a named time range with its own share link. Share scope: public link / same-domain / named people — copying Fathom's three-tier model because it is the right model. The public link must open for a signed-out stranger, which is also a hand-in requirement.

**7. Blended cross-meeting search**

Lexical and semantic in one ranked list, not semantic demoted below a "Find X with AI" link. Results deep-link to the exact moment. Filters on date, participant, speaker and meeting type.

**8. Simulated live meeting mode**

Per the brief, the capture layer is stubbed — no real bot. But rather than a static fixture, there is a **live mode that streams a transcript in real time** with a live-updating summary, so the mid-call highlight interaction is actually demoable rather than merely described. Stubbing capture should not mean stubbing the *experience* of capture.

**9. Real export**

Markdown, VTT, SRT, JSON. The original has none of this — clipboard copy only. It costs an afternoon and it is the difference between a demo and a tool.

---

## What I am deliberately not building

Cutting is the judgement call, so here is the reasoning rather than just the list.

- **The real recording bot.** The brief explicitly permits stubbing it. Audio capture, meeting-platform auth, and bot join reliability would eat the entire window and demonstrate plumbing, not product. Fathom's own Teams integration is its most-complained-about surface; I am not going to lose a day to losing that fight too.
- **CRM sync, Deal View, coaching scorecards.** These are Fathom's Business-tier revenue engine and its real moat. They are also entirely downstream of the core loop working. Building a shallow Deal View would show less judgement than not building one.
- **Auth and billing.** A demo that makes a reviewer sign up is a demo that does not get seen. The app opens straight into a seeded workspace. Sharing still has real scope levels, because that is a product surface; account creation is not.
- **Slack / Asana / Zapier / HubSpot.** Integration breadth is a sales artifact. One well-built export path beats five stubs.
- **Mobile app, SSO/SCIM, retention policies, admin console.** Enterprise surface area. Nothing to learn from building it in a day.
- **Trackers and alerts.** Genuinely good features, honestly cut for time. If there were a tenth item above the line it would be retroactive trackers, since Fathom's *"Trackers do not scan past calls retroactively"* is a backfill-compute limitation rather than a product truth — an easy, visible win for anyone with a day to spend on it.

---

## Stack

Next.js (App Router) + TypeScript + Tailwind, Postgres, deployed on Vercel. Postgres full-text search for the lexical half of search. Seeded with a populated workspace spanning several weeks of meetings — including the eight-person, sixty-minute call, front and centre, because an empty meetings list demonstrates nothing and the hard case is the point.

---

## Design direction

Fathom's published brand palette: Cerulean `#00BEFF`, Electric Violet `#9600FF`, Dolly `#FFF58C`, black `#000000`, Soft Peach `#FAF5F5`. The distinctive part is **true black against a warm off-white** — not the cool grey every SaaS app reaches for. I am keeping that temperature and building both light and dark themes on it, since the black-and-cyan mark suits dark far better than the original's apparently light-only app.

Two specifics, because they are where this category usually looks cheap: **tabular figures for every timestamp** so transcript columns don't jitter during playback, and speaker colour that stays legible at both themes rather than eight hues that collapse into mud on the eight-person call.

## The evidence panel, and why it is the thing I would keep

Every notetaker in this category — Fathom, Otter, Fireflies, Granola, the twenty launched this month — makes the same claim in the same words: the summary is *grounded in your transcript*. It is unfalsifiable as stated, and users have learned to read it as marketing, which is a shame, because the underlying engineering problem is real and solvable.

The failure mode is specific. Ask a model to summarise a transcript and cite its sources and it will happily produce a citation to a timestamp that does not exist, or to a line that says something else. The usual mitigation is to repair it: snap the citation to the nearest line, or to the chapter, and ship it. That is the wrong call. A citation that resolves to approximately the right place is worse than no citation, because it survives a spot check — the reader clicks, lands somewhere plausible, and calibrates upward on everything else the summary said.

So this build does three things instead:

1. **The model cannot express a bad citation in the first place.** It never writes a timestamp. It is shown numbered lines and must cite by index, which turns "is this citation real" from a fuzzy text-matching problem into an array bounds check.
2. **Anything that fails the check is dropped, not repaired.** An unciteable bullet is a bug, not a bullet.
3. **The drop is shown to the user.** Claims proposed, claims anchored, claims discarded — with the discarded text quoted verbatim and the index the model invented.

The third one is the product decision, and it is the one I would defend in a room. It looks like showing your failures. What it actually does is make the other 100% mean something: a product that never admits to a dropped claim is a product where you have no way to distinguish "nothing was wrong" from "nothing was checked".

The cost is honest too. On short, clean transcripts the panel reads "0 dropped" every time, which makes it look decorative. That is why `npm test` exists — it feeds the validator citations no transcript could satisfy and asserts each one is thrown away, so the mechanism is demonstrable even when the model behaves.

The thing I would build next, given another day: a **disagreement score** per bullet — re-ask the model whether the cited line actually supports the claim, and surface the ones where it says no. Index validation catches a citation pointing nowhere. It does not catch a citation pointing at the wrong real line, and that is the harder half.
