#!/usr/bin/env python3
"""
8x assignment - automatic agent prompt/response capture.

Fires on two lifecycle events, configured in .claude/settings.json:
  UserPromptSubmit -> appends a [LOG_ENTRY type=PROMPT ...] block
  Stop             -> reads the session transcript and appends the matching
                      [LOG_ENTRY type=RESPONSE ...] block

Captures ONLY the verbatim prompt and the final assistant response.
No thinking blocks, no tool calls, no intermediate steps.

Never raises into the agent: any failure is written to .agent-logs/.capture-errors.log
and the hook exits 0 so the session is never blocked.
"""
import json
import os
import re
import sys
import traceback
from datetime import datetime, timezone

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LOG_DIR = os.path.join(REPO, ".agent-logs")
ERR_LOG = os.path.join(LOG_DIR, ".capture-errors.log")
AUTHOR = os.environ.get("AGENT_CAPTURE_AUTHOR", "abubakar-dev")
PROJECT = os.environ.get("AGENT_CAPTURE_PROJECT", "8x-fathom-rebuild")
TOOL = "claude-code"


def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.") + \
        f"{datetime.now(timezone.utc).microsecond // 1000:03d}Z"


def log_error(msg):
    try:
        os.makedirs(LOG_DIR, exist_ok=True)
        with open(ERR_LOG, "a") as f:
            f.write(f"[{now_iso()}] {msg}\n")
    except Exception:
        pass


def scope(session_id, transcript):
    """Two sessions can inherit the same UUID (a child `claude -p` does).
    Disambiguate with a short hash of the transcript path."""
    import hashlib
    if not transcript:
        return session_id
    h = hashlib.sha1(os.path.dirname(transcript).encode()).hexdigest()[:4]
    return f"{session_id}-{h}"


def session_file(session_id):
    """One file per session. Stable name once created."""
    os.makedirs(LOG_DIR, exist_ok=True)
    short = session_id[:8]
    for name in sorted(os.listdir(LOG_DIR)):
        if name.endswith(f"_{session_id}.md"):
            return os.path.join(LOG_DIR, name)
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H-%M-%S")
    path = os.path.join(LOG_DIR, f"{stamp}_{session_id}.md")
    date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    with open(path, "w") as f:
        f.write(
            "---\n"
            f"session_id: {session_id}\n"
            f"date: {date}\n"
            f"author: {AUTHOR}\n"
            "model: claude-opus-5\n"
            f"tool: {TOOL}\n"
            f"project: {PROJECT}\n"
            "total_exchanges: 0\n"
            "first_prompt_time: \n"
            "last_prompt_time: \n"
            "---\n\n"
            f"# Session Log - {date}\n\n"
            f"Session: `{short}` | Project: `{PROJECT}` | Author: `{AUTHOR}`\n\n"
            "---\n\n"
        )
    return path


def read_body(path):
    with open(path) as f:
        return f.read()


def update_frontmatter(path, model=None):
    """Recompute total_exchanges / first_prompt_time / last_prompt_time.
    Metadata only - never touches a logged entry."""
    text = read_body(path)
    head, sep, rest = text.partition("\n---\n")
    if not sep:
        return
    prompts = re.findall(
        r"\[LOG_ENTRY type=PROMPT num=\d+ session=[^\]]+\]\ntimestamp: (\S+)", rest)
    total = len(prompts)
    first = prompts[0] if prompts else ""
    last = prompts[-1] if prompts else ""
    head = re.sub(r"^total_exchanges: .*$", f"total_exchanges: {total}",
                  head, flags=re.M)
    head = re.sub(r"^first_prompt_time: ?.*$", f"first_prompt_time: {first}",
                  head, flags=re.M)
    head = re.sub(r"^last_prompt_time: ?.*$", f"last_prompt_time: {last}",
                  head, flags=re.M)
    if model:
        head = re.sub(r"^model: .*$", f"model: {model}", head, flags=re.M)
    with open(path, "w") as f:
        f.write(head + sep + rest)


def next_num(path, kind):
    text = read_body(path)
    nums = [int(n) for n in re.findall(
        rf"\[LOG_ENTRY type={kind} num=(\d+) session=", text)]
    return (max(nums) + 1) if nums else 1


def append_entry(path, kind, num, session_id, model, body):
    short = session_id[:8]
    with open(path, "a") as f:
        f.write(f"[LOG_ENTRY type={kind} num={num} session={short}]\n")
        f.write(f"timestamp: {now_iso()}\n")
        f.write(f"model: {model}\n\n")
        f.write(body.rstrip("\n") + "\n\n\n")


def extract_final_response(transcript_path):
    """Walk the transcript backwards for the last assistant turn's text.
    Skips thinking blocks and tool_use blocks entirely."""
    if not transcript_path or not os.path.exists(transcript_path):
        return None, None
    rows = []
    with open(transcript_path, errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except Exception:
                continue

    model = None
    chunks = []
    # Collect text from trailing assistant messages, stopping at the boundary
    # of the previous human turn (a user message that is not a tool_result).
    for row in reversed(rows):
        if row.get("type") == "user":
            msg = row.get("message") or {}
            content = msg.get("content")
            is_tool_result = False
            if isinstance(content, list):
                is_tool_result = any(
                    isinstance(b, dict) and b.get("type") == "tool_result"
                    for b in content)
            if not is_tool_result:
                break
            continue
        if row.get("type") != "assistant":
            continue
        msg = row.get("message") or {}
        if model is None:
            model = msg.get("model")
        content = msg.get("content")
        if not isinstance(content, list):
            continue
        parts = [b.get("text", "") for b in content
                 if isinstance(b, dict) and b.get("type") == "text"]
        parts = [p for p in parts if p.strip()]
        if parts:
            chunks.insert(0, "\n\n".join(parts))
    if not chunks:
        return None, model
    return "\n\n".join(chunks).strip(), model


def main():
    raw = sys.stdin.read()
    try:
        payload = json.loads(raw) if raw.strip() else {}
    except Exception:
        log_error(f"unparseable stdin: {raw[:400]!r}")
        return

    event = payload.get("hook_event_name") or os.environ.get(
        "CLAUDE_HOOK_EVENT", "")
    session_id = payload.get("session_id") or "unknown-session"
    transcript = payload.get("transcript_path")
    session_id = scope(session_id, transcript)
    path = session_file(session_id)

    if event == "UserPromptSubmit":
        prompt = payload.get("prompt")
        if prompt is None:
            log_error(f"UserPromptSubmit with no prompt field: "
                      f"{list(payload.keys())}")
            return
        num = next_num(path, "PROMPT")
        append_entry(path, "PROMPT", num, session_id, "claude-opus-5", prompt)
        update_frontmatter(path)

    elif event == "Stop":
        text, model = extract_final_response(transcript)
        if not text:
            log_error(f"Stop: no assistant text found in {transcript}")
            return
        p_num = next_num(path, "PROMPT") - 1
        r_num = next_num(path, "RESPONSE")
        if r_num > max(p_num, 1):
            # response already logged for this turn (double Stop) - skip
            log_error(f"Stop: skipping duplicate response num={r_num} "
                      f"(prompts={p_num})")
            return
        append_entry(path, "RESPONSE", r_num, session_id,
                     model or "claude-opus-5", text)
        update_frontmatter(path, model)
    else:
        log_error(f"unhandled event {event!r}; keys={list(payload.keys())}")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        log_error("EXCEPTION\n" + traceback.format_exc())
    sys.exit(0)
