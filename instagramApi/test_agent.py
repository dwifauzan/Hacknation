from types import SimpleNamespace
from unittest.mock import MagicMock

from agent import FALLBACK_REPLY, process_inbox_once
from store import Store


def _message(message_id, user_id, text):
    return SimpleNamespace(id=message_id, user_id=user_id, text=text)


def _thread(thread_id):
    return SimpleNamespace(
        id=thread_id,
        thread_title="customer",
        users=[],
        messages=[_message("latest", "customer-1", "Ada ukuran XL?")],
        is_group=False,
    )


def test_processes_pending_or_regular_thread_once(tmp_path):
    client = MagicMock()
    client.direct_threads.return_value = [_thread("111")]
    client.direct_pending_inbox.return_value = []
    client.direct_thread.return_value = SimpleNamespace(
        messages=[
            _message("m1", "customer-1", "Ada ukuran XL?"),
            _message("m0", "owner-1", "Halo kak"),
        ]
    )
    client.direct_answer.return_value = SimpleNamespace(id="reply-1")
    ai = MagicMock(return_value=SimpleNamespace(reply="Ada kak, kami cek dulu ya."))

    with Store(tmp_path / "store.sqlite3") as store:
        results = process_inbox_once(
            client, store, my_user_id="owner-1", ai_generate=ai, now=100
        )
        again = process_inbox_once(
            client, store, my_user_id="owner-1", ai_generate=ai, now=200
        )

    assert results[0].status == "sent"
    assert again[0].reason == "already_claimed"
    client.direct_answer.assert_called_once_with("111", "Ada kak, kami cek dulu ya.")
    ai.assert_called_once()


def test_uses_fallback_when_ai_fails(tmp_path):
    client = MagicMock()
    client.direct_threads.return_value = [_thread("111")]
    client.direct_pending_inbox.return_value = []
    client.direct_thread.return_value = SimpleNamespace(
        messages=[_message("m1", "customer-1", "Halo")]
    )
    client.direct_answer.return_value = SimpleNamespace(id="reply-1")

    def fail_ai(*args):
        raise RuntimeError("AI unavailable")

    with Store(tmp_path / "store.sqlite3") as store:
        results = process_inbox_once(
            client, store, my_user_id="owner-1", ai_generate=fail_ai, now=100
        )

    assert results[0].reply == FALLBACK_REPLY
    client.direct_answer.assert_called_once_with("111", FALLBACK_REPLY)


def test_does_not_reply_to_own_message(tmp_path):
    client = MagicMock()
    client.direct_threads.return_value = [_thread("111")]
    client.direct_pending_inbox.return_value = []
    client.direct_thread.return_value = SimpleNamespace(
        messages=[_message("m1", "owner-1", "Pesan saya")]
    )
    ai = MagicMock()

    with Store(tmp_path / "store.sqlite3") as store:
        results = process_inbox_once(
            client, store, my_user_id="owner-1", ai_generate=ai, now=100
        )

    assert results[0].reason == "no_incoming_message"
    client.direct_answer.assert_not_called()
    ai.assert_not_called()


def test_does_not_reply_to_older_message_after_latest_owner_reply(tmp_path):
    client = MagicMock()
    client.direct_threads.return_value = [_thread("111")]
    client.direct_pending_inbox.return_value = []
    client.direct_thread.return_value = SimpleNamespace(
        messages=[
            _message("owner-reply", "owner-1", "Sudah kami jawab ya kak"),
            _message("customer-message", "customer-1", "Halo"),
        ]
    )
    ai = MagicMock()

    with Store(tmp_path / "store.sqlite3") as store:
        results = process_inbox_once(
            client, store, my_user_id="owner-1", ai_generate=ai, now=100
        )

    assert results[0].reason == "no_incoming_message"
    client.direct_answer.assert_not_called()
    ai.assert_not_called()
