# Brief check

Every line of the assignment, and what actually happened against it. Written so a reviewer can disagree with a judgement rather than hunt for whether something exists.

Status key: **done** · **you** (needs the submitter's account) · **cut** (deliberate, with reasoning)

---

## Capture setup — the gate

| # | Requirement | Status | Where |
|---|---|---|---|
| 1 | State tool, exact model, and whether it has an automatic hook mechanism, in the first reply | **done** | First reply; recorded in `CAPTURE-TEST.md` §1 |
| 1b | Look it up rather than guess | **done** | Read the runtime's existing hook config before answering, rather than assuming |
| 2 | Install capture that fires on its own | **done, with one disclosed gap** | `.claude/settings.json` → `.claude/hooks/capture.py`. See below |
| 3 | Prompt + final response only. No thinking, tool calls, intermediate steps | **done** | `capture.py` keeps `type: "text"` blocks from the trailing assistant turn and discards the rest |
| 3 | Verbatim, untruncated | **done** | No length cap anywhere in the write path |
| 3 | UTC timestamp | **done** | Every entry |
| 3 | Model name per entry | **done** | Per entry, not just frontmatter, so a mid-build switch is visible |
| 3 | `.agent-logs/` not gitignored | **done** | `.gitignore` says so explicitly, in a comment |
| 3 | Don't edit, tidy, summarise or delete entries | **done, with one disclosure** | One dry-run file deleted before the real canaries; disclosed in `CAPTURE-TEST.md` §5.2 |
| 3 | Commit as you go, interleaved with the code | **done** | 42 commits, logs alongside the code they produced |
| 3 | Format matches the spec exactly | **done** | Frontmatter fields, `[LOG_ENTRY type=… num=… session=…]`, filename `YYYY-MM-DD_HH-MM-SS_<session-id>.md` |
| 4 | Canary prompt, both sides land | **done** | `CAPTURE-TEST.md` §4, pasted raw |
| 4 | Second session, second canary lands | **done** | Separate process. This is the "a hook that only works in the session that created it is not installed" test |
| 4 | `CAPTURE-TEST.md` with all five required items | **done** | Tool/model, mechanism + config file, log path, both canaries raw, what failed first |

### The disclosed gap, stated plainly

The build session is a Cowork session that started *before* the hook config existed, so its own end-of-turn hook never loaded. The canaries prove the hook fires unprompted in sessions that did not install it — that requirement is genuinely met — but for this one long-running session the automatic path is not active.

Rather than leave a hole, `.claude/hooks/backfill.py` rebuilds that session's log from the same on-disk transcript the `Stop` hook reads, and it is run at every commit. Same content, same verbatim text, pulled on a timer instead of pushed by an event.

Two bugs in that backfill were found late, by reading the log rather than trusting it (commit `f931d91`):

- Viewing a screenshot writes an `[Image: original 2880x2800…]` line into the transcript as a user-role message. Six of those were being logged as prompts nobody typed.
- Answers to a multiple-choice question arrive as a *tool result*, not a user message, so they were being skipped entirely — meaning the log showed decisions being acted on with no record of who made them.

Both fixed. The log went from 9 "turns" to 4 real ones.

---

## The product — the brief's "at minimum" list

| Requirement | Status | Where |
|---|---|---|
| Connect a calendar | **done (simulated OAuth)** | Upcoming band at the top of the meetings list: per-meeting capture decision made *before* the meeting, with the rule that chose it stated in words. The connection itself is seeded |
| Get the notetaker into a meeting and record | **done — real capture, not the permitted stub** | `/record` takes the tab's audio (the far side of a Zoom/Meet/Teams call) via `getDisplayMedia`, mixes it with your mic through Web Audio, records the mix, and sends it to Deepgram `nova-3` for diarization. No bot, so it works on all three platforms at once. `/live` also streams the authored hour-long call at 8× so the experience is reviewable without setting up a call |
| Watch playback against the transcript | **done** | Click any line to seek; auto-scroll with an active-line marker; follow mode that yields when you scroll |
| Read the AI summary | **done** | Structured sections, every bullet anchored to a timestamp |
| Switch templates | **done** | Post-hoc switch with regeneration; each template produces different *sections*, not reworded text |
| Pull the action items | **done** | Per-assignee, checkable, anchored, manually addable; plus a cross-meeting board at `/actions` |
| Highlight a moment mid-call and see where it lands | **done** | `/live` — press a category button and it walks backwards to the start of the speaker's turn |
| Search across meetings | **done, and then some** | `/search`, one blended ranked list, deep-linked to the moment — plus **Ask the workspace**, which reads the retrieved lines and answers across all nine meetings with citations naming the meeting, speaker and second |
| Share a clip with someone not on the call | **done** | `/s/<token>` opens signed-out; a clip link carries only that clip's segments |
| **The eight-person hour-long call** | **done — the thing the build is aimed at** | `Q4 Roadmap Lock`: 54 min, 332 segments, 12 chapters, 8 speakers + 1 silent, written to be hostile |

## Hand-in

| Requirement | Status |
|---|---|
| Seed with real data — an empty list tells you nothing | **done** — 9 meetings, 625 lines, threads running between them |
| Live link opens for somebody not signed in as you | **done** — there is no auth at all. Verified from a clean browser context, every route 200 |
| A live link, deployed, not localhost | **done** — Vercel, with Postgres, Anthropic and Deepgram attached |
| Public repository with `.agent-logs/` in it | **you** — set `8x-fathom-rebuild` public before submitting |
| Walkthrough, ≤5 min, camera on, in the walkthrough field | **you** |
| Paste both links into the links field, labelled | **you** |

## Built after the first draft of this file

Everything above was the brief's floor. These went in afterwards and are the
part worth judging on product judgement rather than coverage.

| | What | Why |
|---|---|---|
| **The evidence ledger** | Every generated summary publishes proposed → anchored → **discarded**, and quotes the discarded claims with the index the model invented | Every notetaker says it is "grounded in your transcript". None show the working, because showing it means admitting the model sometimes cites a line that does not exist. `npm test` proves the drop path without an API call |
| **Ask the whole workspace** | One question, answered across all nine meetings, each claim citing the meeting, date, speaker and second | A folder of recordings cannot answer "what did we promise them in July". Neither can a tool that summarises each call in isolation |
| **The contradiction tracker** | Scans every meeting for commitments, pairs them by retrieval score across calls, and judges whether a later one reversed an earlier one. 176 commitments, 36 pairs, 1 contradiction | The failure notes cause is not a bad summary. It is two correct summaries, three weeks apart, that disagree — and nobody re-reads the old one |
| **Real capture** | Tab audio + microphone, mixed in the browser, diarized by Deepgram | The brief permits stubbing this. Not stubbing it is the difference between a demo and a product |
| **Persistence** | One transaction to Postgres; audio to Blob, or a `bytea` column when no store is attached, served with HTTP range support | A recording you lose when the tab closes is not a recording |

## Deliberately cut

Reasoning for each is in `PRODUCT-NOTES.md`. Short version: CRM sync, deal pipelines and coaching scorecards are Fathom's Business-tier moat and are entirely downstream of the core loop working — a shallow version of any of them would show less judgement than none. Auth and billing would make a reviewer sign up to see a demo. Real calendar OAuth, Slack/Asana/Zapier, mobile, SSO and admin are surface area, not product.

The honest near-miss is **retroactive trackers**. Fathom's own limitation — *"Trackers do not scan past calls retroactively"* — is a backfill-compute constraint rather than a product truth, and it would have been next above the line.

## Recon — what I could not do

I did not sign up for Fathom. Sign-in is Google/Microsoft SSO only, and consumer-domain signups are gated behind having a video meeting scheduled in the next seven days; running a real two-minute Zoom call was not possible from a cloud container. So the recon is documentary rather than experiential: the full help centre, the public API's OpenAPI schema, release notes back to early 2025, the pricing page, and the G2/Capterra corpus for the *correct* product — `g2.com/products/fathom-video`, not `g2.com/products/fathom`, which is unrelated accounting software.

That is a real limitation and it is why `PRODUCT-NOTES.md` carries a confidence column. The single most useful thing it turned up was their API schema: `MeetingSummary` is `{ template_name, markdown_formatted }` — an opaque blob — which caps how good a citation can ever be in their product, and is the gap this rebuild exploits.

## Naming

One slug, one wordmark, no third name:

- `8x-fathom-rebuild` — repository, folder, `package.json` name, log `project` field, localStorage key
- **Fathom Rebuild** — the display name in the interface, because a wordmark has to read like one
