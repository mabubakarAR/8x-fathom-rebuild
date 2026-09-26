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

## The resubmission brief

8x's follow-up asked for two things on top of the original: an interface of my own design (the reference product as inspiration, not a template), and a real, connected backend — working database and API, no mock or hardcoded data.

| Requirement | Status | Where |
|---|---|---|
| Own interface | **done** | Landing page, expandable rail, Ask dock, settings-as-sentences, the Meet extension. Nothing is traced from the reference product |
| Real backend, no mock data | **done** | Every page is `loadWorkspace(ownerId)` over Postgres; every edit is `POST /api/meetings/<id>/mutate`. The seed corpus is an *importable sample*, marked as such, not a data source |
| Working DB + API | **done** | Neon Postgres, `src/lib/db/schema.sql`, idempotent `migrate()`. `/api/setup` reports what is attached |
| One-minute intro video | **you** | |

## The product — the brief's "at minimum" list

| Requirement | Status | Where |
|---|---|---|
| Connect a calendar | **done — real Google OAuth** | Second consent (`calendar.readonly`, offline). Next seven days on the home page with a record / skip decision per meeting and the rule that chose it, from `users.auto_record` |
| Get the notetaker into a meeting and record | **done — no bot, by design** | Chrome extension puts **Record with Noted** inside Google Meet → `/record?join=…` → tab audio + mic via `getDisplayMedia`/`getUserMedia` → Deepgram `nova-3` diarized. Works on Zoom and Teams links from the calendar too |
| Watch playback against the transcript | **done** | Audio served with range support; click any line to seek; follow mode yields when you scroll |
| Read the AI summary | **done** | Every bullet anchored to a line; unanchored claims shown as dropped |
| Switch templates | **done** | Regenerates with different sections, not reworded text; default template is a setting |
| Pull the action items | **done** | Per-person, checkable (persisted), addable; cross-meeting board at `/actions` |
| Highlight a moment mid-call | **done** | Walks back to the start of the speaker's turn; `/live` replays the sample call at 8× so this is reviewable without a meeting |
| Search across meetings | **done** | `/search` blended BM25 + cosine, per-user index; **Ask** (`?`) answers across every meeting with citations naming meeting, speaker and second |
| Share a clip with someone not on the call | **done** | `/s/<token>` is public; carries only that clip |
| The eight-person hour-long call | **done** | *Q4 Roadmap Lock* in the sample: 54 min, 332 lines, 12 chapters, 8 speakers |

## Hand-in

| Requirement | Status |
|---|---|
| Seed with real data | **done** — the sample workspace, one click from an empty home page, removable from Settings |
| Live link opens for somebody not signed in as you | **done** — landing, `/about`, `/privacy`, `/terms`, `/s/<token>` are public. The app itself is per-user, and a **Guest** door exists for reviewers whose Google domain blocks unverified apps |
| A live link, deployed | **done** — Vercel with Postgres, Google OAuth, Anthropic and Deepgram attached |
| Public repository with `.agent-logs/` | **done** — committed as it went |
| Intro video (1 min) and walkthrough (≤5 min) | **you** |

## Deliberately cut

Zoom and Teams *sign-in* (both need marketplace review; links from the calendar still open in the recorder). A desktop app for calls outside a browser tab. CRM sync, deal pipelines, coaching, billing, admin, mobile. Reasoning for each is in `PRODUCT-NOTES.md`.

## Naming

- `8x-fathom-rebuild` — repository, `package.json` name, log `project` field, because that is what the assignment was called
- **Noted** — the product, everywhere a person sees it
