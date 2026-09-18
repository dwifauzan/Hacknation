"""Safety gate for full-auto replies.

Every check that decides "should we auto-reply?" lives here so the rules
are in one auditable place. The polling loop and the HTTP service both
call into this module.

`check_message` accepts any object with the documented attributes
(dataclass, SimpleNamespace, ORM row) — we use getattr so callers are free.
"""
import os
from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass(frozen=True)
class Decision:
    allowed: bool
    reason: str = "ok"
    text: str = ""

    def __bool__(self) -> bool:
        return self.allowed


@dataclass
class GateConfig:
    my_user_id: str = ""
    max_reply_chars: int = 1000
    min_gap_seconds: float = 20.0
    max_per_thread_per_hour: int = 10


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


def config_from_env() -> GateConfig:
    return GateConfig(
        my_user_id=str(os.environ.get("IG_MY_USER_ID", "")),
        max_reply_chars=_env_int("AI_MAX_REPLY_CHARS", 1000),
        min_gap_seconds=_env_float("REPLY_MIN_GAP_SECONDS", 20.0),
        max_per_thread_per_hour=_env_int("REPLY_MAX_PER_THREAD_PER_HOUR", 10),
    )


def enabled() -> bool:
    """Kill switch. Default ON; anything other than 0/off/false disables it."""
    raw = str(os.environ.get("AUTOREPLY_ENABLED", "1")).strip().lower()
    return raw not in ("0", "false", "no", "off")


def check_message(msg, cfg: Optional[GateConfig] = None) -> Decision:
    """Should we consider auto-replying to this incoming DM?

    Order matters: cheap/absolute blocks first.
    """
    cfg = cfg or config_from_env()

    message_id = str(getattr(msg, "message_id", "") or "").strip()
    thread_id = str(getattr(msg, "thread_id", "") or "").strip()
    sender_id = str(getattr(msg, "sender_id", "") or "").strip()

    if not message_id or not thread_id or not sender_id:
        return Decision(False, "missing_id")

    if cfg.my_user_id and sender_id == str(cfg.my_user_id):
        return Decision(False, "own_message")

    if bool(getattr(msg, "is_echo", False)):
        return Decision(False, "echo")

    if bool(getattr(msg, "is_group", False)):
        return Decision(False, "group_thread")

    text = str(getattr(msg, "text", "") or "").strip()
    if not text:
        return Decision(False, "empty_text")

    return Decision(True, "ok", text)


def check_reply_text(text: str, cfg: Optional[GateConfig] = None) -> Decision:
    """Validate the AI's reply before it is sent."""
    cfg = cfg or config_from_env()
    clean = (text or "").strip()
    if not clean:
        return Decision(False, "empty_reply")
    if len(clean) > cfg.max_reply_chars:
        return Decision(False, "reply_too_long")
    return Decision(True, "ok", clean)


@dataclass
class RateLimiter:
    """In-memory per-thread rate limiting.

    Two rules: a minimum gap between replies in the same thread, and a
    rolling hourly cap per thread. Guards against runaway loops.
    """

    min_gap_seconds: float = 20.0
    max_per_hour: int = 10
    _last: Dict[str, float] = field(default_factory=dict)
    _hits: Dict[str, List[float]] = field(default_factory=dict)

    def allow(self, thread_id: str, now: float) -> Decision:
        tid = str(thread_id)

        last = self._last.get(tid)
        if last is not None and (now - last) < self.min_gap_seconds:
            return Decision(False, "min_gap")

        window = [t for t in self._hits.get(tid, []) if now - t < 3600.0]
        if len(window) >= self.max_per_hour:
            self._hits[tid] = window
            return Decision(False, "hourly_cap")

        window.append(now)
        self._hits[tid] = window
        self._last[tid] = now
        return Decision(True, "ok")

    def reset(self) -> None:
        self._last.clear()
        self._hits.clear()
