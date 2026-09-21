# CAPTURE-TEST

Proof that automatic agent prompt/response capture is installed and firing.

## 1. Tool and model

| | |
|---|---|
| **Tool** | Claude (Cowork mode), running on the Claude Agent SDK. Same runtime and same hook engine as the Claude Code CLI — the CLI binary is present in the environment and I used it directly for the canary sessions. |
| **Model** | `claude-opus-5` for both planning and execution. One model, no plan/execute split. Any mid-build switch will show up in the `model:` field of each individual log entry, not just the frontmatter. |
| **Automatic mechanism?** | Yes. Lifecycle hooks (`UserPromptSubmit`, `Stop`) declared in `.claude/settings.json`. I confirmed the mechanism existed in this runtime before writing anything, by reading the hook config already present in the environment rather than assuming. |

## 2. Mechanism and config

**Config file changed:** [`.claude/settings.json`](.claude/settings.json) (committed, repo root)

```json
{
  "hooks": {
    "UserPromptSubmit": [
      { "matcher": "", "hooks": [{ "type": "command",
        "command": "python3 \"$CLAUDE_PROJECT_DIR/.claude/hooks/capture.py\"" }] }
    ],
    "Stop": [
      { "matcher": "", "hooks": [{ "type": "command",
        "command": "python3 \"$CLAUDE_PROJECT_DIR/.claude/hooks/capture.py\"" }] }
    ]
  }
}
```

**Hook script:** [`.claude/hooks/capture.py`](.claude/hooks/capture.py)

- `UserPromptSubmit` receives the prompt on stdin as JSON → appends a `PROMPT` entry, verbatim, untruncated.
- `Stop` receives `transcript_path` on stdin → walks the session transcript backwards from the end, collects **only** `type: "text"` blocks from the trailing assistant turn, and appends the matching `RESPONSE` entry.
- Thinking blocks, `tool_use` blocks, `tool_result` blocks, file reads, diffs and retries are all discarded. Prompt in, final answer out.
- The script never throws into the session. Any failure goes to `.agent-logs/.capture-errors.log` and it exits 0.

**Backup mechanism:** [`.claude/hooks/backfill.py`](.claude/hooks/backfill.py)

The hooks are primary. This script is the safety net — it rebuilds a session log deterministically from the on-disk session transcript, so a turn that happened before the hook was installed (or any turn where a hook failed to fire) still gets captured verbatim. It regenerates from the transcript rather than editing entries by hand.

I used it once for real: the first prompt of this build — the assignment brief itself — arrived **before** the hook existed, so it was recovered from the transcript rather than captured live. That entry is in `2026-09-21_08-35-06_761a185d-...md` and is genuine, not reconstructed by hand.

**One quirk worth naming:** a child `claude -p` session in this environment inherits the parent's session UUID. Two sessions would therefore have written to the same log file. `capture.py` now scopes the filename with a short hash of the transcript directory, so concurrent sessions stay in separate files. This is why the canary filenames carry a `-cli2` / `-bd47` suffix.

## 3. Where the canaries landed

| Canary | Log file |
|---|---|
| 1 | `.agent-logs/2026-09-21_08-44-18_761a185d-2d3a-5f3a-81b8-30fde7c9f919-cli2.md` |
| 2 | `.agent-logs/2026-09-21_08-45-02_761a185d-2d3a-5f3a-81b8-30fde7c9f919-bd47.md` |

Two **separate** sessions, each spawned as its own process. Neither was the session that installed the hook — which is the point of the test. `.agent-logs/.capture-errors.log` was empty after both.

## 4. Canary entries, pasted raw

### Canary 1 — `2026-09-21_08-44-18_761a185d-2d3a-5f3a-81b8-30fde7c9f919-cli2.md`

```
---
session_id: 761a185d-2d3a-5f3a-81b8-30fde7c9f919-cli2
date: 2026-09-21
author: abubakar-dev
model: claude-opus-5
tool: claude-code
project: 8x-fathom-rebuild
total_exchanges: 1
first_prompt_time: 2026-09-21T08:44:18.073Z
last_prompt_time: 2026-09-21T08:44:18.073Z
---

# Session Log - 2026-09-21

Session: `761a185d` | Project: `fathom-rebuild` | Author: `abubakar-dev`

---

[LOG_ENTRY type=PROMPT num=1 session=761a185d]
timestamp: 2026-09-21T08:44:18.073Z
model: claude-opus-5

CAPTURE TEST — 8x assignment, Abubakar. Reply with exactly one short sentence confirming you received this, nothing else.


[LOG_ENTRY type=RESPONSE num=1 session=761a185d]
timestamp: 2026-09-21T08:44:21.101Z
model: claude-opus-5

Received — CAPTURE TEST, 8x assignment, Abubakar.
```

### Canary 2 — `2026-09-21_08-45-02_761a185d-2d3a-5f3a-81b8-30fde7c9f919-bd47.md`

```
---
session_id: 761a185d-2d3a-5f3a-81b8-30fde7c9f919-bd47
date: 2026-09-21
author: abubakar-dev
model: claude-opus-5
tool: claude-code
project: 8x-fathom-rebuild
total_exchanges: 1
first_prompt_time: 2026-09-21T08:45:02.994Z
last_prompt_time: 2026-09-21T08:45:02.994Z
---

# Session Log - 2026-09-21

Session: `761a185d` | Project: `fathom-rebuild` | Author: `abubakar-dev`

---

[LOG_ENTRY type=PROMPT num=1 session=761a185d]
timestamp: 2026-09-21T08:45:02.994Z
model: claude-opus-5

CAPTURE TEST 2 — 8x assignment, Abubakar. Second canary, separate session. Reply with one short sentence only.


[LOG_ENTRY type=RESPONSE num=1 session=761a185d]
timestamp: 2026-09-21T08:45:06.598Z
model: claude-opus-5

Received — CAPTURE TEST 2, 8x assignment, Abubakar, second canary logged.
```

## 5. What I tried first that did not work

1. **Writing the hook config to the user-level settings file** (`~/.claude/settings.json`) as well as the repo one, so it would apply regardless of working directory. The environment's safety classifier refused the write as self-modification. I did not try to route around it — the repo-level `.claude/settings.json` is the correct home for this anyway, since it has to ship with the submission. Repo-level turned out to be sufficient.

2. **A dry run with a synthetic payload before the real canaries.** I piped a hand-written `UserPromptSubmit` and `Stop` JSON into `capture.py` to check the transcript parsing before trusting it. It worked, but it wrote a fake entry into `.agent-logs/`, so I deleted that one file and started clean with the real canaries. Naming it here because it is the only thing ever removed from `.agent-logs/` and I would rather disclose it than have it look like a gap. Nothing has been deleted since, and nothing will be.

3. **Assuming one file per session UUID was safe.** It was not — see the child-session UUID collision in section 2. Caught it because canary 2 overwrote canary 1's file on the first attempt.

4. **Trusting `backfill.py`'s own docstring.** It said *"It only ADDS turns that are missing from the existing log"*. It did not. It rebuilt the entire file from the transcript on every run, which was indistinguishable from appending right up until the session transcript was **compacted** — at which point the transcript no longer contained the early turns, and one routine run cut the main log from 53 KB to 17 KB.

   Caught by looking at `wc -c` before and after instead of at the script's own success message, and restored with `git checkout` because the log was already committed. The script now reads the existing entries back, matches them on prompt text rather than entry number (numbers shift under compaction; the words a person typed do not), appends only genuinely new turns numbered on from the highest already present, and updates the frontmatter counters in place. It is idempotent: a second run reports `already complete (11 turns on disk, nothing to add)` and writes nothing.

   Disclosing it because the whole point of this document is that the capture record is trustworthy, and a backup mechanism that can silently delete the thing it is backing up is worth more as a disclosed-and-fixed bug than as a clean-looking section. Nothing was lost — the log was committed, so the pre-bug content was recoverable and is present verbatim.

5. **Verbatim capture into a public repo, with no redaction.** The spec asks for the prompt *verbatim*, and that is what the hook wrote — including the turn where an API key was pasted into the chat. It reached one local commit and was caught by grepping the bundle for a key prefix before handover, not by anything clever.

   Both `capture.py` and `backfill.py` now pass every entry through a `redact()` filter before it touches `.agent-logs/`: provider keys, GitHub and Slack tokens, AWS access-key IDs, JWTs, and database URLs with inline credentials. The replacement is a visible marker rather than a deletion, so the log still shows that a key was pasted and where, which is the part that matters for an audit trail. Nothing else about the entry changes: same words, same structure, same timestamps.

   The offending commit was amended before the repository was ever pushed, so the key is not in any published history — verified by re-cloning the bundle and grepping every object. The key is being rotated regardless, on the principle that a secret which briefly existed in a git object is a secret you no longer have.

## 5b. Known limitation, stated plainly

The **primary build session is a Cowork session that started before the hook config existed**, so its `Stop` hook never loaded and does not fire. The two canaries prove the hook fires unprompted in sessions that did *not* install it — that requirement is genuinely met — but for this one long-running session the automatic path is not active.

Rather than leave a hole, every commit in this build runs:

```
python3 .claude/hooks/backfill.py /root/.claude/projects/-home-claude/<session>.jsonl
```

which regenerates that session's log from the transcript on disk. The content is identical and equally verbatim — it is extracted from the same transcript the `Stop` hook reads, just pulled on a timer instead of on an event. I am flagging it because "a hook that only works in the session that created it is not installed" is the exact failure mode the spec warns about, and mine is the inverse of it: it works everywhere *except* the session that created it.

## 6. Scope note

This session runs in a cloud container, not on the local Mac. The hook fires in the container, so the repo is built there and mirrored out. Building directly on the local filesystem would have meant no automatic capture at all, which is the wrong trade.

---

**Status: GREEN.** Capture fires on its own, in sessions that did not install it, for both prompt and response. Build starts now.
