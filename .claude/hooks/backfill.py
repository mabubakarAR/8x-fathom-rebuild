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

    body_prompts = set()
    if existing:
        with open(existing) as f:
            cur = f.read()
        body_prompts = set(re.findall(
            r"\[LOG_ENTRY type=PROMPT num=(\d+) session=", cur))
        out = existing
    else:
        first = turns[0]["ptime"] or datetime.now(timezone.utc).isoformat()
        stamp = first[:19].replace("T", "_").replace(":", "-")
        out = os.path.join(LOG_DIR, f"{stamp}_{session_id}.md")
        cur = ""

    model = next((t["model"] for t in turns if t["model"]), "claude-opus-5")
    date = (turns[0]["ptime"] or "")[:10]
    head = (
        "---\n"
        f"session_id: {session_id}\n"
        f"date: {date}\n"
        f"author: {AUTHOR}\n"
        f"model: {model}\n"
        "tool: claude-code\n"
        f"project: {PROJECT}\n"
        f"total_exchanges: {len(turns)}\n"
        f"first_prompt_time: {turns[0]['ptime']}\n"
        f"last_prompt_time: {turns[-1]['ptime']}\n"
        "---\n\n"
        f"# Session Log - {date}\n\n"
        f"Session: `{short}` | Project: `{PROJECT}` | Author: `{AUTHOR}`\n\n"
        "---\n\n")

    parts = [head]
    for i, t in enumerate(turns, 1):
        parts.append(
            f"[LOG_ENTRY type=PROMPT num={i} session={short}]\n"
            f"timestamp: {t['ptime']}\n"
            f"model: {t['model'] or model}\n\n"
            f"{t['prompt'].rstrip()}\n\n\n")
        resp = "\n\n".join(t["chunks"]).strip()
        if resp:
            parts.append(
                f"[LOG_ENTRY type=RESPONSE num={i} session={short}]\n"
                f"timestamp: {t['rtime'] or t['ptime']}\n"
                f"model: {t['model'] or model}\n\n"
                f"{resp}\n\n\n")
    with open(out, "w") as f:
        f.write("".join(parts))
    print(f"wrote {out} ({len(turns)} turns)")


if __name__ == "__main__":
    main()
