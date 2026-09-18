"""SQLite store: atomic anti-duplicate claims + reply log + rate bookkeeping.

Why a store at all? In full-auto mode the loop polls repeatedly. Without a
durable, atomic "have I already handled this message id?" check, a restart or
an overlapping cycle would send duplicate replies. The UNIQUE primary key on
message_id plus INSERT OR IGNORE makes the claim race-safe.
"""
import sqlite3
from pathlib import Path
from typing import List, Optional

SCHEMA = """
CREATE TABLE IF NOT EXISTS claims (
    message_id  TEXT PRIMARY KEY,
    thread_id   TEXT NOT NULL,
    sender_id   TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'claimed',  -- claimed|sent|skipped
    reason      TEXT,
    reply_text  TEXT,
    claimed_at  REAL NOT NULL,
    replied_at  REAL,
    updated_at  REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    kind       TEXT NOT NULL,
    message_id TEXT,
    thread_id  TEXT,
    detail     TEXT,
    created_at REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_claims_thread ON claims(thread_id);
CREATE INDEX IF NOT EXISTS idx_claims_replied ON claims(replied_at);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
"""


class Store:
    def __init__(self, path) -> None:
        self.path = Path(path)
        self._conn = sqlite3.connect(str(self.path), timeout=10.0, isolation_level=None)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.execute("PRAGMA foreign_keys=ON")
        self._conn.execute("PRAGMA busy_timeout=10000")
        self._conn.executescript(SCHEMA)

    # --- lifecycle ---------------------------------------------------------
    def close(self) -> None:
        try:
            self._conn.close()
        except Exception:
            pass

    def __enter__(self) -> "Store":
        return self

    def __exit__(self, *exc) -> bool:
        self.close()
        return False

    # --- claims (anti-duplicate) ------------------------------------------
    def claim(self, message_id: str, thread_id: str, sender_id: str, now: float) -> bool:
        """Atomically claim a message id. True if we won the claim."""
        mid = str(message_id or "").strip()
        if not mid:
            raise ValueError("message_id must not be empty")
        cur = self._conn.execute(
            "INSERT OR IGNORE INTO claims "
            "(message_id, thread_id, sender_id, status, claimed_at, updated_at) "
            "VALUES (?, ?, ?, 'claimed', ?, ?)",
            (mid, str(thread_id), str(sender_id), float(now), float(now)),
        )
        return cur.rowcount == 1

    def release(self, message_id: str) -> None:
        """Undo a claim so the message can be retried on a later poll."""
        self._conn.execute(
            "DELETE FROM claims WHERE message_id = ?", (str(message_id),)
        )

    def mark_sent(self, message_id: str, reply_text: str = "", now: float = 0.0) -> None:
        self._conn.execute(
            "UPDATE claims SET status='sent', reply_text=?, replied_at=?, updated_at=? "
            "WHERE message_id = ?",
            (str(reply_text or ""), float(now), float(now), str(message_id)),
        )

    def mark_skipped(self, message_id: str, reason: str = "", now: float = 0.0) -> None:
        self._conn.execute(
            "UPDATE claims SET status='skipped', reason=?, updated_at=? "
            "WHERE message_id = ?",
            (str(reason or ""), float(now), str(message_id)),
        )

    def was_claimed(self, message_id: str) -> bool:
        row = self._conn.execute(
            "SELECT 1 FROM claims WHERE message_id = ?", (str(message_id),)
        ).fetchone()
        return row is not None

    # --- rate bookkeeping --------------------------------------------------
    def last_reply_at(self, thread_id: str) -> Optional[float]:
        row = self._conn.execute(
            "SELECT MAX(replied_at) AS t FROM claims "
            "WHERE thread_id = ? AND status='sent'",
            (str(thread_id),),
        ).fetchone()
        if row is None or row["t"] is None:
            return None
        return float(row["t"])

    def reply_count_since(self, thread_id: str, since: float) -> int:
        row = self._conn.execute(
            "SELECT COUNT(*) AS c FROM claims "
            "WHERE thread_id = ? AND status='sent' AND replied_at >= ?",
            (str(thread_id), float(since)),
        ).fetchone()
        return int(row["c"])

    # --- event log ---------------------------------------------------------
    def log_event(self, kind: str, message_id: str = "", thread_id: str = "",
                  detail: str = "", now: float = 0.0) -> None:
        self._conn.execute(
            "INSERT INTO events (kind, message_id, thread_id, detail, created_at) "
            "VALUES (?, ?, ?, ?, ?)",
            (str(kind), str(message_id or ""), str(thread_id or ""),
             str(detail or "")[:2000], float(now)),
        )

    def recent_log(self, limit: int = 20) -> List[dict]:
        rows = self._conn.execute(
            "SELECT kind, message_id, thread_id, detail, created_at FROM events "
            "ORDER BY id DESC LIMIT ?",
            (int(limit),),
        ).fetchall()
        return [dict(r) for r in rows]

    def stats(self) -> dict:
        sent = self._conn.execute(
            "SELECT COUNT(*) AS c FROM claims WHERE status='sent'"
        ).fetchone()["c"]
        skipped = self._conn.execute(
            "SELECT COUNT(*) AS c FROM claims WHERE status='skipped'"
        ).fetchone()["c"]
        claimed = self._conn.execute(
            "SELECT COUNT(*) AS c FROM claims"
        ).fetchone()["c"]
        return {"claimed": int(claimed), "sent": int(sent), "skipped": int(skipped)}
