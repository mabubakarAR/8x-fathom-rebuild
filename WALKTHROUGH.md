# Walkthrough script

Loom, camera on, hard cap five minutes. Timings are generous — a first take usually lands around 4:40.

## Before you press record

Open four tabs:

1. The live URL, on **`/import`**, with `samples/renewal-call.vtt` already in the file picker.
2. A tab where that import has **already finished**, sitting on the Evidence panel. Analysis takes 20–30 seconds and you cannot spend 30 seconds of a 5-minute video watching a spinner.
3. **Q4 Roadmap Lock** (`/m/m-roadmap-lock`).
4. A **private window** with a clip link from `/clips` already copied.

The trick for the import beat: start the real import, keep talking over it, then cut to tab 2. You are showing that it works, not waiting for it.

---

## 0:00 — The one sentence that matters (20s)

> "This is a rebuild of Fathom, built in a day. One thing up front so nothing I show you is ambiguous: the *capture* is stubbed — no bot joins a call, no audio is recorded. The brief said that was a legitimate call. Everything after capture is real, and I'll prove it rather than assert it."

## 0:20 — Real analysis, on a file you bring (55s)

Tab 1. Drop in `samples/renewal-call.vtt`, hit analyse, keep talking.

> "This is a transcript the app has never seen. No database row, no fixture. It's going to Claude right now.
>
> And here's the constraint the whole thing is built on: **the model is never allowed to write a timestamp.** It sees the transcript as numbered lines, and every claim it makes has to carry the index of the line it came from. Then the server checks every index against the real array before any of it reaches the screen."

Cut to tab 2.

> "Title, three chapters, a sales-template summary, five action items, clips — none of it written by me. Click any bullet…" *(click one)* "…and you're on the line it came from."

## 1:15 — The Evidence panel (60s) — **do not cut this**

Evidence tab.

> "Every notetaker on the market says its summary is 'grounded in your transcript'. None of them show you the working, because showing it means admitting the model sometimes cites a line that doesn't exist.
>
> So: thirty-one claims proposed, thirty-one anchored to a real line, nothing thrown away on this run. When something *is* thrown away it appears here — struck through, with the index the model invented and why it failed."

Then, to make the point concrete:

> "And it's dropped, never repaired. Snapping a bad citation to the nearest plausible line gives you something that looks right and points at the wrong words, which is worse than no claim at all. That path has its own test — `npm test` feeds the validator a bullet citing line nine thousand of a ten-line transcript and asserts it gets thrown away. A validator that's only ever seen well-behaved output isn't a validator."

Flip the **Evidence toggle** on the Summary tab.

> "And on any summary: every claim with the actual line it's standing on, underneath it."

## 2:15 — Ask, and getting told no (30s)

Ask tab. Type: **What is the contract value?**

> "This isn't in the transcript. Watch."

> "'The transcript doesn't cover that.' It cites the lines that justify the absence. Retrieval narrows the transcript, the model only ever sees real lines, every citation comes back through the same validator — and an answer that loses all of its citations gets labelled unsupported instead of shown as fact."

## 2:45 — The hard case (65s)

Tab 3 — **Q4 Roadmap Lock**.

> "The brief pointed at the eight-person call that runs an hour, which is where Fathom visibly strains. Fifty-four minutes, 332 lines, eight speakers. The problem with that call is knowing where to start.
>
> Chapters — twelve, on the scrubber and down the transcript. This strip is who spoke when across the whole hour; amber is overlapping speech, so you can see the shape of the argument before reading a word. And the transcript flags what it wasn't sure of — eighteen lines, filterable."

Click a wavy-underlined line, then a speaker name.

> "This is the one I'd defend hardest. The best-corroborated complaint about Fathom is misattribution when people talk over each other. Fixing one line is busywork." *(click **Fix all**)* "Every line from that voice, one action."

## 3:50 — Search (30s)

`/search`, type **churn risk**.

> "One ranked list. Fathom puts keyword results first and hides the semantic ones behind a 'Find X with AI' link, which makes the better retriever the one you opt into. I inverted that.
>
> Amber is my words, blue is what it expanded to — cancellation, renewal, worry, switch. And I'll be straight: that's a curated synonym table with BM25 and cosine, not neural embeddings. It solves the vocabulary-mismatch case. It won't solve true paraphrase."

## 4:20 — Signed out, and the honest bit (35s)

Paste the clip link into the **private window**.

> "A clip opened by someone with no account. They get this range and its transcript, not the rest of the hour — the link carries its own payload.
>
> What's real and what's simulated is written up at `/about`, `PRODUCT-NOTES.md` has every cut with the reasoning, and `CAPTURE-TEST.md` is green and names its own gap rather than hiding it. Thanks."

---

## Cut these if you're running long

In order: the search beat (0:30), the template switch, the `/about` mention at the end.

**Do not cut** the Evidence panel or the speaker-repair click. The first is the thing nobody else is doing; the second is the thing that's visibly better than the original.

## Worth saying out loud if asked

- **Why keep the authored corpus at all?** So the interface is reviewable in thirty seconds without anyone uploading an hour of audio first. It is not a stand-in for the pipeline — both are in the repo, and every screen says which one you're looking at.
- **Why does a seeded meeting have no Evidence tab?** A ledger reading "0 dropped" over hand-written fixtures would be a lie of omission. Nothing was validated because nothing was generated.
- **Where does an imported meeting live?** The browser that imported it. The Postgres path is in `src/lib/pipeline`; wiring it up is a connection string, not a rewrite.
- **The other sample.** `samples/anonymous-standup.txt` has no timestamps and no speaker tags — the parser synthesises timings from speaking rate and *says so in the UI*, and the model has to work out who is who. It gets one speaker, flags it, and hands you the repair flow.
