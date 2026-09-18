"""Failing-first test for bot-safe session reuse.

Rule: reuse a valid session.json via account_info() WITHOUT sending
password / triggering a fresh CAA login (which risks 2FA/challenge).
"""
from unittest.mock import MagicMock

from ig_client import try_session_login


def test_valid_session_does_not_call_password_login(tmp_path):
    fake_session = tmp_path / "session.json"
    fake_session.write_text('{"uuids": {}}')

    client = MagicMock()
    # load_settings succeeds, account_info succeeds -> session valid
    client.account_info.return_value = {"username": "someone"}

    ok = try_session_login(client, fake_session)

    assert ok is True
    client.load_settings.assert_called_once_with(str(fake_session))
    client.account_info.assert_called_once()
    # MUST NOT trigger a fresh password login on valid session
    client.login.assert_not_called()


def test_invalid_session_returns_false_without_login(tmp_path):
    fake_session = tmp_path / "session.json"
    fake_session.write_text('{"uuids": {}}')

    from instagrapi.exceptions import LoginRequired

    client = MagicMock()
    client.account_info.side_effect = LoginRequired("login_required")

    ok = try_session_login(client, fake_session)

    assert ok is False
    client.login.assert_not_called()


def test_missing_session_file_returns_false(tmp_path):
    client = MagicMock()
    ok = try_session_login(client, tmp_path / "nope.json")
    assert ok is False
    client.load_settings.assert_not_called()
    client.login.assert_not_called()
