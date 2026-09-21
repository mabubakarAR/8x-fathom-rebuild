#!/usr/bin/env python3
"""
Safety net for the 8x capture requirement.

The hooks in .claude/settings.json are the primary mechanism. This script is
the belt-and-braces backup: it rebuilds a session log deterministically from
the Claude Code session transcript on disk, so if a hook ever fails to fire
(or fired before the hook was installed) the record is still complete and
still verbatim.

Usage:  python3 .claude/hooks/backfill.py <transcript.jsonl> [--out DIR]

It only ADDS turns that are missing from the existing log. It never edits or
removes an entry that is already there.

That guarantee used to be a comment rather than a behaviour. The script
rebuilt the whole file from the transcript every run, which was harmless right
up until the session transcript was compacted — at which point the transcript
no longer held the early turns, and "rebuild from the transcript" silently
meant "delete two thirds of the log". It is now an append: existing entries are
read back, matched on their prompt text, and only genuinely new turns are
written, numbered on from the highest number already in the file.
"""
import json
import os
import re
import sys
from datetime import datetime, timezone

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LOG_DIR = os.path.join(REPO, ".agent-logs")
AUTHOR = os.environ.get("AGENT_CAPTURE_AUTHOR", "abubakar-dev")
PROJECT = os.environ.get("AGENT_CAPTURE_PROJECT", "8x-fathom-rebuild")

# Turns injected by the harness rather than typed by the human.
SYNTHETIC = re.compile(
    r"^\s*<(system-reminder|command-name|local-command|task-notification"
    r"|user_memory_snapshot)", re.I)

# Viewing a screenshot puts an "[Image: original 2880x2800...]" metadata line
# into the transcript as a user-role message. It is not something the human
# typed and it must not be logged as a prompt.
IMAGE_META = re.compile(r"^\s*\[Image:\s*original\s+\d+x\d+", re.I)

# A multiple-choice answer comes back as a TOOL RESULT rather than a user
# message, because the question was asked through a tool. The words inside it
# are still the human's, and leaving them out means the log shows me acting on
# decisions with no record of who made them. They go in as prompts.
ANSWER = re.compile(r"^\s*The user answered:", re.S)



# ---------------------------------------------------------------------------
# Secret redaction
# ---------------------------------------------------------------------------
# A verbatim log of everything a person typed is exactly what you want for the
# assignment's audit trail, and exactly what you do not want in a public repo
# the moment somebody pastes an API key into the chat. Somebody did.
#
# So nothing reaches .agent-logs/ without passing through here. The log stays
# verbatim in every respect that matters — the words, the structure, the
# timestamps — and loses only the token itself, replaced by a marker that says
# what was removed so the redaction is visible rather than silent.
SECRETS = [
    # provider keys
    (re.compile(r"\bsk-ant-(?:api|admin)\d{2}-[A-Za-z0-9_\-]{20,}"), "sk-ant-«REDACTED-KEY»"),
    (re.compile(r"\bsk-[A-Za-z0-9]{20,}"), "sk-«REDACTED-KEY»"),
    (re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}"), "gh«REDACTED-TOKEN»"),
    (re.compile(r"\bxox[baprs]-[A-Za-z0-9\-]{10,}"), "xox-«REDACTED-TOKEN»"),
    (re.compile(r"\bAKIA[0-9A-Z]{16}\b"), "AKIA«REDACTED»"),
    (re.compile(r"\beyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}"), "«REDACTED-JWT»"),
    # postgres/mysql URLs with inline credentials
    (re.compile(r"\b(postgres(?:ql)?|mysql|mongodb(?:\+srv)?)://[^\s:@/]+:[^\s@]+@"), r"\1://«REDACTED»@"),
]


def redact(text):
    """Strip credentials from anything about to be written to the log."""
    if not text:
        return text
    for pattern, replacement in SECRETS:
        text = pattern.sub(replacement, text)
    return text


def answer_text(content) -> str:
    """Pull an AskUserQuestion answer out of a tool_result block."""
    if not isinstance(content, list):
        return ""
    for b in content:
        if not isinstance(b, dict) or b.get("type") != "tool_result":
            continue
        raw = b.get("content")
        if isinstance(raw, list):
            raw = "".join(
                x.get("text", "") for x in raw if isinstance(x, dict))
        if isinstance(raw, str) and ANSWER.match(raw):
            return raw.strip()
    return ""


def iso(ts):
    if not ts:
        return ""
    try:
        d = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        d = d.astimezone(timezone.utc)
        return d.strftime("%Y-%m-%dT%H:%M:%S.") + f"{d.microsecond // 1000:03d}Z"
    except Exception:
        return ts


def text_of(content):
    if isinstance(content, str):
        return content
    if not isinstance(content, list):
        return ""
    return "\n\n".join(
        b.get("text", "") for b in content
        if isinstance(b, dict) and b.get("type") == "text").strip()


def is_tool_result(content):
    return isinstance(content, list) and any(
        isinstance(b, dict) and b.get("type") == "tool_result" for b in content)


def load_turns(path):
    rows = []
    with open(path, errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except Exception:
                continue

    turns, cur = [], None
    for row in rows:
        t = row.get("type")
        msg = row.get("message") or {}
        content = msg.get("content")
        if t == "user":
            if is_tool_result(content):
                ans = answer_text(content)
                if ans:
                    if cur:
                        turns.append(cur)
                    cur = {"prompt": ans, "ptime": iso(row.get("timestamp")),
                           "chunks": [], "model": None, "rtime": ""}
                continue
            body = text_of(content)
            if IMAGE_META.match(body):
                continue
            if not body.strip() or SYNTHETIC.match(body):
                # harness-injected; keep it attached to the real prompt
                if cur is not None:
                    continue
                continue
            if cur:
                turns.append(cur)
            cur = {"prompt": body, "ptime": iso(row.get("timestamp")),
                   "chunks": [], "model": None, "rtime": ""}
        elif t == "assistant" and cur is not None:
            body = text_of(content)
            if msg.get("model") and not cur["model"]:
                cur["model"] = msg.get("model")
            if body:
                cur["chunks"].append(body)
                cur["rtime"] = iso(row.get("timestamp"))
    if cur:
        turns.append(cur)
    return turns


def norm(text):
    """Prompt text reduced to something stable enough to match on."""
    return re.sub(r"\s+", " ", (text or "")).strip()[:400]


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    transcript = sys.argv[1]
    session_id = os.path.basename(transcript).replace(".jsonl", "")
    short = session_id[:8]
    turns = load_turns(transcript)
    if not turns:
        print("no turns found")
        return

    os.makedirs(LOG_DIR, exist_ok=True)
    existing = None
    for name in sorted(os.listdir(LOG_DIR)):
        if name.endswith(f"_{session_id}.md"):
            existing = os.path.join(LOG_DIR, name)
            break

    # What is already on disk. Matching on the prompt text rather than the
    # entry number is what makes this safe to run repeatedly: numbers shift
    # when the transcript is compacted, the words a person typed do not.
    seen = set()
    max_num = 0
    cur = ""
    if existing:
        with open(existing) as f:
            cur = f.read()
        out = existing
        for m in re.finditer(
            r"\[LOG_ENTRY type=PROMPT num=(\d+) session=[^\]]*\]\n"
            r"timestamp:[^\n]*\nmodel:[^\n]*\n\n(.*?)(?=\n\n\n\[LOG_ENTRY|\Z)",
            cur, re.S,
        ):
            max_num = max(max_num, int(m.group(1)))
            seen.add(norm(m.group(2)))
    else:
        first = turns[0]["ptime"] or datetime.now(timezone.utc).isoformat()
        stamp = first[:19].replace("T", "_").replace(":", "-")
        out = os.path.join(LOG_DIR, f"{stamp}_{session_id}.md")

    model = next((t["model"] for t in turns if t["model"]), "claude-opus-5")
    date = (turns[0]["ptime"] or "")[:10]

    fresh = [t for t in turns if norm(t["prompt"]) not in seen]
    if not fresh:
        print(f"{out}: already complete ({max_num} turns on disk, nothing to add)")
        return

    parts = []
    if not cur:
        parts.append(
            "---\n"
            f"session_id: {session_id}\n"
            f"date: {date}\n"
            f"author: {AUTHOR}\n"
            f"model: {model}\n"
            "tool: claude-code\n"
            f"project: {PROJECT}\n"
            f"total_exchanges: {len(fresh)}\n"
            f"first_prompt_time: {fresh[0]['ptime']}\n"
            f"last_prompt_time: {fresh[-1]['ptime']}\n"
            "---\n\n"
            f"# Session Log - {date}\n\n"
            f"Session: `{short}` | Project: `{PROJECT}` | Author: `{AUTHOR}`\n\n"
            "---\n\n")

    for i, t in enumerate(fresh, max_num + 1):
        parts.append(
            f"[LOG_ENTRY type=PROMPT num={i} session={short}]\n"
            f"timestamp: {t['ptime']}\n"
            f"model: {t['model'] or model}\n\n"
            f"{redact(t['prompt']).rstrip()}\n\n\n")
        resp = redact("\n\n".join(t["chunks"]).strip())
        if resp:
            parts.append(
                f"[LOG_ENTRY type=RESPONSE num={i} session={short}]\n"
                f"timestamp: {t['rtime'] or t['ptime']}\n"
                f"model: {t['model'] or model}\n\n"
                f"{resp}\n\n\n")

    body = cur + "".join(parts) if cur else "".join(parts)

    # Keep the frontmatter counters honest without rewriting the entries.
    if cur:
        body = re.sub(r"(?m)^total_exchanges: .*$",
                      f"total_exchanges: {max_num + len(fresh)}", body, count=1)
        body = re.sub(r"(?m)^last_prompt_time: .*$",
                      f"last_prompt_time: {fresh[-1]['ptime']}", body, count=1)

    with open(out, "w") as f:
        f.write(body)
    print(f"{out}: appended {len(fresh)} turn(s), {max_num + len(fresh)} total")


if __name__ == "__main__":
    main()
