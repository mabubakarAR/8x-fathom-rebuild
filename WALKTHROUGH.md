# Walkthrough script

Loom, camera on, hard cap five minutes. Timings are generous — a first take usually lands around 4:30.

Open two tabs before you hit record: the live URL, and a **private window** with a clip link from `/clips` already copied. That saves fumbling at the 4-minute mark, which is where these always overrun.

---

## 0:00 — What this is, and the one thing I'd have you look at (25s)

> "This is a rebuild of Fathom, built in a day. Before anything else — the capture layer is simulated. No bot joins a meeting, no audio is recorded. The brief said that was a legitimate call, and I took it, because the time was better spent somewhere specific.
>
> Here's where. Fathom is very good at the two-person sales call. It visibly strains at the eight-person call that runs an hour — which is the case the brief points at. So that's what I built for, and everything I'm about to show exists because of that call."

## 0:25 — The list, and the calendar (30s)

Scroll the meetings list.

> "Nine meetings, real transcripts, threads that run between them. Two things Fathom's own web list doesn't have: a one-line gist per row, and for the big call, a talk-time bar — Rachel took 23%, one person never spoke at all.
>
> Up top is the calendar side. Capture decided per meeting *before* it happens, and the rule that chose it is written out rather than applied invisibly. That one's struck through — 'compensation review', matched a do-not-record rule."

## 0:55 — The hard case (70s)

Open **Q4 Roadmap Lock**.

> "Fifty-four minutes, 332 lines, eight speakers. Here's the problem with an hour of eight people: where do you even start.
>
> Three answers. Chapters — twelve of them, on the scrubber and down the transcript. This strip is who spoke when across the whole hour; amber is overlapping speech, so you can see the shape of the argument before reading a word. And the transcript flags what it wasn't sure about — eighteen lines here, filterable."

Click a wavy-underlined line, then a speaker name.

> "This is the one I'd defend hardest. The best-corroborated complaint about Fathom is misattribution when people talk over each other. Fixing one line is busywork." *(click Fix all)* "That's every line from that voice, in one action."

## 2:05 — Summary and citations (45s)

Right rail, Summary tab. Hover a bullet, click one.

> "Fathom stores a summary as one markdown blob — that's from their own API schema — so the only citation they can offer is a hyperlink buried in prose. Here every bullet is a row that carries its own anchor. Click it, you're at the moment."

Switch template to **Retrospective**.

> "Switching template re-shapes it — different sections, not reworded text."

## 2:50 — Search (45s)

`/search`, type **churn risk**.

> "One ranked list. Fathom puts keyword results first and hides the semantic ones behind a 'Find X with AI' link, which makes the better retriever the one you have to opt into. I inverted that.
>
> Amber is my words. Blue is what it expanded to — cancellation, renewal, worry, switch. That's the vocabulary-mismatch problem their users complain about, and I'll be straight: that's a curated synonym table plus BM25 and cosine, not neural embeddings. It solves this case; it won't solve true paraphrase."

## 3:35 — Sharing, signed out (35s)

Copy a clip link, paste into the **private window**.

> "A clip, opened by someone with no account and nothing in their browser. They get this range and its transcript — not the rest of the hour. The link carries its own payload, which is how sharing works with no database."

## 4:10 — Live, and the honest bit (40s)

`/live`, press **Join the call**, let it run ~8 seconds, hit **Decision**.

> "Capture is stubbed, but the mid-call experience isn't — this is the real transcript at eight times speed. Now watch: I press highlight *late*, after the point's been made." *(press it)* "It went back 22 seconds to the start of that speaker's turn. That's Fathom's idea and it's the cleverest thing in their product — and it's missing from their own bot-free version.
>
> What's simulated and what's real is written up at `/about`, and the repo has `PRODUCT-NOTES.md` — the research, and every cut I made with the reasoning. Thanks."

---

## Cut these if you're running long

In order: the template switch (0:35), the calendar band (0:30), the `/about` mention at the end.

**Do not cut** the speaker-repair click or the search expansion colours. Those are the two moments where the thing is visibly better than the original rather than just different.

## Worth saying out loud if asked

- No database, on purpose — server-rendered seed plus a per-viewer overlay, so the third reviewer doesn't see what the second one broke.
- Nine meetings are fiction, but consistent fiction: the Salesforce date promised in the Kestrel call is the one walked back in the roadmap call.
- `CAPTURE-TEST.md` is green, and it names its own gap rather than hiding it.
