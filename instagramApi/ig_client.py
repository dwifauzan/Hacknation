"""Bot-safe Instagram login wrapper (instagrapi 3.0.2).

Strategy to DODGE 2FA/challenge triggers:
1. NEVER do a fresh password login if a valid session.json exists.
   Validate via account_info() only (no password sent, no CAA flow).
2. Keep the same device UUIDs: load_settings() before anything, and
   dump_settings() only AFTER a successful login. Never delete session.json.
3. No aggressive retries. On 2FA/challenge/rate-limit: stop, tell the user
   to approve in the official app on the same IP, then retry later.
"""
from pathlib import Path

SESSION_FILE = Path(__file__).parent / "session.json"


def create_client(proxy=None, delay_range=None):
    """Create Client with human-like delays, stable defaults."""
    from instagrapi import Client

    # Small random delay between requests looks human; big bursts flag bots.
    return Client(
        proxy=proxy,
        delay_range=delay_range or [1, 3],
    )


def try_session_login(client, session_path=SESSION_FILE) -> bool:
    """Reuse saved session WITHOUT password. Returns True if still valid."""
    from instagrapi.exceptions import ClientError, LoginRequired

    path = Path(session_path)
    if not path.is_file():
        return False
    try:
        client.load_settings(str(path))
    except Exception:
        return False
    try:
        client.account_info()
        return True
    except (LoginRequired, ClientError, Exception):
        # Any failure = session stale. Caller falls through to password login.
        return False


def password_login_and_save(client, username: str, password: str,
                            session_path=SESSION_FILE,
                            verification_code: str = "") -> bool:
    """Fresh CAA login (only when session reuse failed). Saves session."""
    import os

    ok = client.login(username, password, verification_code=verification_code)
    if ok:
        client.dump_settings(str(session_path))
        try:
            os.chmod(session_path, 0o600)  # cookies+tokens: owner-only
        except Exception:
            pass
    return ok


def secure_session_perms(session_path=SESSION_FILE) -> None:
    """Best-effort: ensure existing session.json is owner-only."""
    import os

    try:
        if Path(session_path).is_file():
            os.chmod(session_path, 0o600)
    except Exception:
        pass
