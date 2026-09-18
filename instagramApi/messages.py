"""MVP messages: list threads, read thread, reply — all via saved session.

Bot-safe rules:
- Never login here; caller must have a valid session (try_session_login first).
- Listing/reading is read-only: no seen-marking, no extra requests.
- Inbox listing includes both regular conversations and pending message requests.
- Reply uses direct_answer(thread_id, text) exactly once per call.
"""
from typing import Any

# Safety caps: large fetches = many paginated private_request calls in a burst
# -> PleaseWait / feedback_required / action block. Keep human-scale.
MAX_INBOX = 50
MAX_READ = 50
MAX_TEXT_LEN = 1000


def _usernames(users) -> list:
    names = []
    for u in users or []:
        name = getattr(u, "username", None) or str(u)
        names.append(name)
    return names


def format_thread_summary(thread) -> dict:
    messages = getattr(thread, "messages", None) or []
    last = messages[0] if messages else None
    return {
        "id": str(getattr(thread, "id", "")),
        "title": getattr(thread, "thread_title", "") or "",
        "users": _usernames(getattr(thread, "users", [])),
        "is_group": bool(getattr(thread, "is_group", False)),
        "last_text": (getattr(last, "text", None) or "") if last else "",
        "last_id": str(getattr(last, "id", "")) if last else "",
    }


def format_message(m: Any) -> dict:
    return {
        "id": str(getattr(m, "id", "")),
        "user_id": str(getattr(m, "user_id", "") or ""),
        "text": getattr(m, "text", None) or "",
        "item_type": getattr(m, "item_type", None) or "",
        "timestamp": str(getattr(m, "timestamp", "") or ""),
    }


def list_threads(client, amount: int = 20) -> list:
    """Return regular and pending thread summaries, newest first. Read-only.

    Instagram keeps messages from people the account does not follow in a
    separate pending/request inbox. Fetching only ``direct_threads`` silently
    omits those conversations.
    """
    n = max(1, min(int(amount or 20), MAX_INBOX))
    threads = list(client.direct_threads(n) or [])
    pending_threads = list(client.direct_pending_inbox(n) or [])

    # A thread can move between folders while the two requests are running.
    # Keep one copy and order the combined result by Instagram's activity time.
    by_id = {}
    for thread in threads + pending_threads:
        thread_id = str(getattr(thread, "id", "") or "")
        if thread_id:
            by_id[thread_id] = thread

    def activity_key(thread):
        value = getattr(thread, "last_activity_at", None)
        if value is None:
            return float("-inf")
        timestamp = getattr(value, "timestamp", None)
        if callable(timestamp):
            return timestamp()
        try:
            return float(value)
        except (TypeError, ValueError):
            return float("-inf")

    combined = sorted(by_id.values(), key=activity_key, reverse=True)
    return [format_thread_summary(t) for t in combined[:n]]


def read_thread(client, thread_id: str, amount: int = 20) -> list:
    """Return messages for one thread. Read-only."""
    tid = str(thread_id or "").strip()
    if not tid.isdigit():
        raise ValueError("Invalid THREAD_ID: must be numeric inbox id.")
    n = max(1, min(int(amount or 20), MAX_READ))
    thread = client.direct_thread(tid, n)
    return [format_message(m) for m in (getattr(thread, "messages", None) or [])]


def reply_to_thread(client, thread_id: str, text: str):
    """Send one text reply. Raises ValueError on empty text."""
    tid = str(thread_id or "").strip()
    if not tid.isdigit():
        raise ValueError("Invalid THREAD_ID: must be numeric inbox id.")
    clean = (text or "").strip()
    if not clean:
        raise ValueError("Reply text must not be empty.")
    if len(clean) > MAX_TEXT_LEN:
        raise ValueError(f"Reply too long ({len(clean)} > {MAX_TEXT_LEN} chars). Shorten it.")
    return client.direct_answer(tid, clean)
