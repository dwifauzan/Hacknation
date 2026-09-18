"""Failing-first tests for MVP messages: list threads, read, reply."""
from unittest.mock import MagicMock
from types import SimpleNamespace

from messages import format_thread_summary, list_threads, read_thread, reply_to_thread


def _thread(**kw):
    base = dict(
        id="111",
        thread_title="alice",
        users=[SimpleNamespace(username="alice", pk="1")],
        messages=[SimpleNamespace(id="m1", text="hi", user_id="1")],
    )
    base.update(kw)
    return SimpleNamespace(**base)


def test_list_threads_returns_summaries_without_extra_calls():
    client = MagicMock()
    client.direct_threads.return_value = [_thread(), _thread(id="222", thread_title="bob")]
    client.direct_pending_inbox.return_value = []

    out = list_threads(client, amount=5)

    assert [t["id"] for t in out] == ["111", "222"]
    client.direct_threads.assert_called_once_with(5)
    client.direct_pending_inbox.assert_called_once_with(5)
    # must not mark seen / send anything while listing
    client.direct_send_seen.assert_not_called()
    client.direct_answer.assert_not_called()


def test_list_threads_includes_pending_requests_from_non_followed_users():
    client = MagicMock()
    client.direct_threads.return_value = [_thread(id="111")]
    client.direct_pending_inbox.return_value = [
        _thread(id="333", thread_title="not_followed")
    ]

    out = list_threads(client, amount=5)

    assert [thread["id"] for thread in out] == ["111", "333"]
    assert out[1]["title"] == "not_followed"


def test_list_threads_deduplicates_threads_returned_by_both_folders():
    client = MagicMock()
    client.direct_threads.return_value = [_thread(id="111", thread_title="regular")]
    client.direct_pending_inbox.return_value = [
        _thread(id="111", thread_title="pending")
    ]

    out = list_threads(client, amount=5)

    assert [thread["id"] for thread in out] == ["111"]
    assert len(out) == 1


def test_read_thread_returns_messages():
    client = MagicMock()
    client.direct_thread.return_value = _thread(
        messages=[
            SimpleNamespace(id="m1", text="hi", user_id="1", timestamp="t1"),
            SimpleNamespace(id="m2", text="hello", user_id="2", timestamp="t2"),
        ]
    )
    out = read_thread(client, "111", amount=10)
    assert [m["id"] for m in out] == ["m1", "m2"]
    client.direct_thread.assert_called_once_with("111", 10)


def test_reply_sends_via_direct_answer_and_validates():
    client = MagicMock()
    client.direct_answer.return_value = SimpleNamespace(id="m9")

    msg = reply_to_thread(client, "111", "hello there")
    assert msg.id == "m9"
    client.direct_answer.assert_called_once_with("111", "hello there")


def test_reply_rejects_empty_text():
    client = MagicMock()
    try:
        reply_to_thread(client, "111", "   ")
    except ValueError:
        pass
    else:
        raise AssertionError("empty text must raise ValueError")
    client.direct_answer.assert_not_called()


def test_format_thread_summary_shape():
    s = format_thread_summary(_thread())
    assert s["id"] == "111"
    assert s["title"] == "alice"
    assert "alice" in s["users"]
    assert s["last_text"] == "hi"
