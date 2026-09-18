"""One safe AI-powered Instagram DM processing cycle."""
from dataclasses import dataclass
import time
from types import SimpleNamespace
from typing import Callable, Optional

from ai_reply import generate
from guardrails import GateConfig, RateLimiter, check_message, check_reply_text
from messages import MAX_READ, list_threads, read_thread, reply_to_thread


FALLBACK_REPLY = (
    "Maaf kak, pesan kamu akan kami teruskan ke admin. Mohon ditunggu sebentar ya."
)


@dataclass(frozen=True)
class ProcessResult:
    status: str
    thread_id: str = ""
    message_id: str = ""
    reply: str = ""
    reason: str = ""


def _incoming_message(messages: list, my_user_id: str):
    """Return the newest message only when it is an incoming text message."""
    if not messages:
        return None
    message = messages[0]
    sender_id = str(message.get("user_id", "") or "")
    if sender_id == str(my_user_id) or not message.get("text", "").strip():
        return None
    return message


def _history(messages: list, my_user_id: str) -> list:
    """Convert Instagram messages (newest first) to AI history order."""
    history = []
    for message in reversed(messages):
        text = message.get("text", "").strip()
        sender_id = str(message.get("user_id", "") or "")
        if text and sender_id:
            history.append({
                "role": "assistant" if sender_id == str(my_user_id) else "user",
                "text": text,
            })
    return history


def process_inbox_once(
    client,
    store,
    *,
    my_user_id: str,
    now: Optional[float] = None,
    ai_generate: Callable = generate,
    max_threads: int = 20,
    max_messages: int = MAX_READ,
) -> list:
    """Process each currently visible thread at most once."""
    if not str(my_user_id or "").strip():
        raise ValueError("my_user_id is required for safe auto-replies.")

    current_time = float(time.time() if now is None else now)
    config = GateConfig(my_user_id=str(my_user_id))
    limiter = RateLimiter(
        min_gap_seconds=config.min_gap_seconds,
        max_per_hour=config.max_per_thread_per_hour,
    )
    results = []

    for summary in list_threads(client, max_threads):
        thread_id = summary["id"]
        if summary.get("is_group"):
            results.append(ProcessResult("skipped", thread_id, reason="group_thread"))
            continue

        messages = read_thread(client, thread_id, max_messages)
        incoming = _incoming_message(messages, my_user_id)
        if incoming is None:
            results.append(ProcessResult("skipped", thread_id, reason="no_incoming_message"))
            continue

        message_id = str(incoming["id"] or "").strip()
        sender_id = str(incoming["user_id"] or "").strip()
        msg = SimpleNamespace(
            message_id=message_id,
            thread_id=thread_id,
            sender_id=sender_id,
            text=incoming["text"],
            is_group=False,
            is_echo=False,
        )
        decision = check_message(msg, config)
        if not decision:
            results.append(ProcessResult("skipped", thread_id, message_id, reason=decision.reason))
            continue
        if not limiter.allow(thread_id, current_time):
            results.append(ProcessResult("skipped", thread_id, message_id, reason="rate_limited"))
            continue
        if store.was_claimed(message_id) or not store.claim(message_id, thread_id, sender_id, current_time):
            results.append(ProcessResult("skipped", thread_id, message_id, reason="already_claimed"))
            continue

        try:
            try:
                generated = ai_generate(
                    decision.text,
                    _history(messages, my_user_id),
                )
                reply = getattr(generated, "reply", "") or ""
            except Exception as exc:
                store.log_event("ai_error", message_id, thread_id, type(exc).__name__, current_time)
                reply = FALLBACK_REPLY

            reply_decision = check_reply_text(reply, config)
            if not reply_decision:
                store.mark_skipped(message_id, reply_decision.reason, current_time)
                results.append(ProcessResult("skipped", thread_id, message_id, reason=reply_decision.reason))
                continue

            reply_to_thread(client, thread_id, reply_decision.text)
            store.mark_sent(message_id, reply_decision.text, current_time)
            store.log_event("reply_sent", message_id, thread_id, "", current_time)
            results.append(ProcessResult("sent", thread_id, message_id, reply_decision.text))
        except Exception:
            store.release(message_id)
            raise

    return results
