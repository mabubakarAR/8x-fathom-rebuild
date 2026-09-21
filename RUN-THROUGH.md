# Run-through — check everything yourself

Ten minutes, in order. Chrome on desktop. Each step says what should happen,
so anything that doesn't is a bug worth telling me about.

---

## Before you start — two env vars on Vercel

| Key | What breaks without it |
|---|---|
| `ANTHROPIC_API_KEY` | Every AI step. Already set. |
| `DEEPGRAM_API_KEY` | **The far side of a call is recorded but not transcribed.** Free tier at deepgram.com gives $200 of credit; you need the key only for step 2. |

Vercel → your project → Settings → Environment Variables → Redeploy.

---

## 1 · The landing page — 30 seconds

Open the site.

- Headline, and a panel on the right already running by itself.
- Watch it for one full loop (~8s): five claims appear, each carrying the
  transcript line it cites. The fourth one — *"Annual contract value is
  $240,000"* citing line **[31]** of a 30-line transcript — turns red,
  strikes through, and the tally lands on **5 proposed · 3 verified · 1 deleted**.
- Scroll once. The call grid: coloured tiles, each waveform drawn from that
  meeting's real speaking pattern. **Hover one** — it lifts, darkens, and a
  play button rises. The purple 54-minute tile has amber bars: real crosstalk.

**Checking:** the panel loops without being clicked, and the tiles respond to hover.

---

## 2 · Capture a real call — 3 minutes

The thing you said was missing.

1. Start a Google Meet or Zoom **in a browser tab** (a solo meeting is fine — or
   phone a colleague and put them on it).
2. In the app: **Record** (top right) → choose **"A call I'm in"** → **Choose the call tab**.
3. In Chrome's share dialog: pick the **tab** your call is in, and **tick
   "Also share tab audio"** at the bottom left. This is the step that matters.
4. Talk for 30–60 seconds. Have the other person talk too.
5. **Stop and write the notes.**

**Checking, in order:**

- Two waveforms while recording — **you above the centre line, the call below it.**
  If the lower half is flat, tab audio wasn't shared; stop and redo step 3.
- Your own words appear live in the transcript as you speak. The other person's
  don't — that's expected and the page says so. The browser's speech API can
  only hear your microphone.
- On stop: *"Sending the recording for transcription and speaker separation…"*
  then *"N turns, N speakers separated by nova-3."*
- You land on a meeting page with **everyone's words**, separated by speaker,
  and audio you can play back.

**Without `DEEPGRAM_API_KEY`** the call still records and you still get notes,
but only from your half — and a warning during the call tells you that.

**No call handy?** Choose **"Just this room"** and talk into your mic for
30 seconds. Same flow, one voice.

### Does it survive the tab?

This is the part worth testing, because it is the part that is easy to fake.

1. Copy the meeting URL.
2. Close the tab. Open the URL **on your phone**, or in a private window.

The transcript, the speakers, the summary, the action items, the evidence
ledger and **the audio** all come back — none of it was in your browser. Open
`/api/setup` and the `audio` field says where the recording actually went:
`blob` when an object store is attached, `database` otherwise, `browser only`
if nothing is. On this deployment it says `database` — Vercel's newer Blob
stores issue a store id rather than a token and the token that makes the store
id usable isn't injected here, so the audio lives in Postgres beside the rest
of the call. A few megabytes of Opus in a `bytea` column, served by
`/api/calls/<id>/audio` with real range support so scrubbing works in Safari.

**Checking:** `curl -I` that URL and you get `accept-ranges: bytes` and the
byte length. `DELETE /api/calls/<id>` removes the call and every row that
hangs off it, audio included.

---

## 3 · The receipts — 1 minute

On the meeting you just made:

- Next to the title: **"29/29 claims verified"**. Click it.
- The **Evidence** tab: proposed → anchored → discarded, counting up, with the
  model and elapsed time. Anything discarded appears struck through with the
  index the model invented.
- Back to **Summary** → click **Evidence** (top right of the pane). Every claim
  now has the actual transcript line quoted underneath it.

**Checking:** the numbers add up — proposed = verified + discarded.

---

## 4 · Templates that generate — 1 minute

Still on that meeting, Summary tab.

- **All 17 templates** → the grid opens, grouped.
- Click **Sales — MEDDPICC** (it has a sparkle: never been run).
- ~20 seconds. It comes back as the eight MEDDPICC gates: Metrics, Economic
  buyer, Decision criteria, Decision process, Paper process, Identified pain,
  Champion, Competition.
- Switch back to **General** — the original is still there. Nothing was
  overwritten.

**Checking:** the headings genuinely change, not just the wording.

---

## 5 · Ask it something it can't know — 45 seconds

**Ask** tab. Type: **"What is the contract value?"**

It should say the transcript doesn't cover that, and cite the lines that show
the absence. If it invents a number, that's a bug — tell me.

Then ask something it *can* answer and check the citations jump to the right
moments.

### 5b · Ask *every* meeting at once — 45 seconds

The per-meeting Ask answers "what did we say in this call". This answers the
question people actually have.

**Search** in the top nav → paste:

> **what did we promise Brightwater about December?**

Then **Ask the workspace**. About eight seconds.

It should tell you that **no such promise was made** — and then explain the two
December items that do exist, one of which is a deadline *Brightwater* imposed
on you, not one you gave them. Under the answer, every line it used: the
meeting, the date, the speaker, the timestamp, quoted. Click one and you land
on that second of that call.

Try the harder one:

> **did we ever change our mind about the second data source?**

**Checking:** the ledger under the answer — *N citations anchored · read N
lines across N meetings · Ns · model*. If it ever cites a line it wasn't given,
that line is **discarded and named** in red rather than silently dropped. The
answer is drawn from the same retriever the search results below it came from,
so every claim is one you can reproduce by reading the list underneath.

**The point:** a folder of recordings cannot answer this. Neither can a tool
that summarises each call in isolation.

---

## 6 · Commitments — the closer — 1 minute

**Commitments** in the top nav → **Scan all meetings**. ~25 seconds.

- **176 commitments across 9 meetings · 36 pairs compared · 1 contradicted.**
- The contradiction: Diego offered to build a rollout plan around a December
  delivery date (Kestrel technical discovery, 8 Sept) — and in a later Kestrel
  call that feature is off the Q4 list with the date never confirmed.
- Click either side; it jumps to that exact moment in that meeting.

**Checking:** it finds the December/Salesforce thread. That's two meetings
weeks apart, both sets of notes individually correct.

---

## 7 · The hard call — 1 minute

**My Calls** → **Q4 Roadmap Lock** (the purple 54-minute tile).

- Press **Read aloud** in the player. Eight synthesised voices, one per
  speaker, and the transcript follows what's being spoken.
- The **speaker lanes** under the scrubber: who talked when across the hour,
  amber where they talked over each other.
- Click a wavy-underlined line (low confidence) → click the speaker's name →
  **Fix all N lines from this voice.**
- **Export** → Markdown, VTT, SRT or JSON. Fathom has no transcript export at all.

---

## 8 · Signed out — 30 seconds

**Playlists** → copy a clip link → open it in a **private window**.

You get that clip and its transcript. Not the rest of the hour — the link
carries only its own payload.

---

## If something's wrong

| Symptom | Cause |
|---|---|
| Lower waveform flat during a call | Tab audio not shared — redo the share dialog |
| Only your words transcribed after a call | `DEEPGRAM_API_KEY` missing |
| Sample button greyed out | `ANTHROPIC_API_KEY` missing |
| No words while speaking | Not Chrome/Edge, or the mic is muted |
| Nothing plays on a demo meeting | Expected — those have no recording. Use **Read aloud** |
