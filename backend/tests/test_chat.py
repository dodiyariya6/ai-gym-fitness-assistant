# tests/test_chat.py
"""
==================================================
IFA — Intelligent Fitness Assistant

File: test_chat.py

Purpose:
Covers persisted AI fitness coach conversations
(chat_service.py / fitness_chat.py router).

Tests:
6. Chat session persistence and bounded history work
   correctly.
7. Cross-user chat-session isolation prevents one user
   from accessing another user's session.

==================================================
"""

from app.services import chat_service


# ── Test 6 ──────────────────────────────────────────────────────────────────


def test_chat_session_persists_and_bounds_history(client, make_user, auth_headers, db):
    user = make_user()
    headers = auth_headers(user)

    # First call with no session_id starts a new session.
    first = client.post("/fitness/chat", json={"message": "Hello coach"}, headers=headers)
    assert first.status_code == 200
    session_id = first.json()["session_id"]

    # Continuing the same session_id reuses it rather than creating a new one.
    second = client.post(
        "/fitness/chat",
        json={"message": "What should I do today?", "session_id": session_id},
        headers=headers,
    )
    assert second.status_code == 200
    assert second.json()["session_id"] == session_id

    # Session persisted with both messages (+ their assistant replies) and an
    # auto-derived title from the first user message.
    persisted = chat_service.get_session_with_messages(db, user.id, session_id)
    assert persisted.title == "Hello coach"
    assert len(persisted.messages) == 4  # 2 user + 2 assistant

    # Bounded history: push well past MAX_HISTORY_MESSAGES and confirm the
    # window never exceeds the configured cap and stays in chronological order.
    for i in range(chat_service.MAX_HISTORY_MESSAGES + 5):
        chat_service.append_message(db, persisted, "user", f"message {i}")

    bounded = chat_service.get_bounded_history(db, session_id)
    assert len(bounded) <= chat_service.MAX_HISTORY_MESSAGES
    assert bounded[-1]["content"] == f"message {chat_service.MAX_HISTORY_MESSAGES + 4}"
    # Chronological order: each message's index is strictly increasing.
    contents = [m["content"] for m in bounded if m["content"].startswith("message ")]
    indices = [int(c.split(" ")[1]) for c in contents]
    assert indices == sorted(indices)


# ── Test 7 ──────────────────────────────────────────────────────────────────


def test_cross_user_chat_session_isolation(client, make_user, auth_headers):
    user_a = make_user(username="alice", email="alice@example.com")
    user_b = make_user(username="bob", email="bob@example.com")

    created = client.post(
        "/fitness/chat", json={"message": "This is Alice's session"}, headers=auth_headers(user_a)
    )
    assert created.status_code == 200
    session_id = created.json()["session_id"]

    # Bob cannot read Alice's session — 404, not 403 (never confirms it exists).
    read_attempt = client.get(
        f"/fitness/sessions/{session_id}/messages", headers=auth_headers(user_b)
    )
    assert read_attempt.status_code == 404

    # Bob cannot continue Alice's session via chat either.
    hijack_attempt = client.post(
        "/fitness/chat",
        json={"message": "Trying to hijack", "session_id": session_id},
        headers=auth_headers(user_b),
    )
    assert hijack_attempt.status_code == 404

    # Alice's own session remains untouched and accessible only to her.
    alice_read = client.get(
        f"/fitness/sessions/{session_id}/messages", headers=auth_headers(user_a)
    )
    assert alice_read.status_code == 200
    assert len(alice_read.json()["messages"]) == 2  # 1 user + 1 assistant
