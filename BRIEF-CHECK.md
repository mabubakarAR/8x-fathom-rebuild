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
| 3 | Commit as you go, interleaved with the code | **done** | 10 commits, logs alongside the code they produced |
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
| Get the notetaker into a meeting and record | **simulated — explicitly permitted** | `/live` streams the hour-long call at 8× against a clock |
| Watch playback against the transcript | **done** | Click any line to seek; auto-scroll with an active-line marker; follow mode that yields when you scroll |
| Read the AI summary | **done** | Structured sections, every bullet anchored to a timestamp |
| Switch templates | **done** | Post-hoc switch with regeneration; each template produces different *sections*, not reworded text |
| Pull the action items | **done** | Per-assignee, checkable, anchored, manually addable; plus a cross-meeting board at `/actions` |
| Highlight a moment mid-call and see where it lands | **done** | `/live` — press a category button and it walks backwards to the start of the speaker's turn |
| Search across meetings | **done** | `/search`, one blended ranked list, deep-linked to the moment |
| Share a clip with someone not on the call | **done** | `/s/<token>` opens signed-out; a clip link carries only that clip's segments |
| **The eight-person hour-long call** | **done — the thing the build is aimed at** | `Q4 Roadmap Lock`: 54 min, 332 segments, 12 chapters, 8 speakers + 1 silent, written to be hostile |

## Hand-in

| Requirement | Status |
|---|---|
| Seed with real data — an empty list tells you nothing | **done** — 9 meetings, 625 lines, threads running between them |
| Live link opens for somebody not signed in as you | **done in the code** — there is no auth at all, and the share route was verified in a clean browser context |
| Public repository with `.agent-logs/` in it | **you** — push `8x-fathom-rebuild`, then set the repo public |
| A live link, deployed, not localhost | **you** — import the repo on Vercel. No env vars, no database |
| Walkthrough, ≤5 min, camera on, in the walkthrough field | **you** — script in `WALKTHROUGH.md` |
| Paste both links into the links field, labelled | **you** |

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
