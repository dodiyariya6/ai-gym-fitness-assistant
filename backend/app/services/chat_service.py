# app/services/chat_service.py
"""
==================================================
IFA — Intelligent Fitness Assistant

File: chat_service.py

Purpose:
Persists AI fitness coach conversations and provides
a bounded history window for follow-up prompts, so the
chatbot has real memory without ever sending the full
lifetime conversation to Gemini.

Functionality:
- Creates/loads chat sessions, one per conversation.
- Appends user/assistant messages.
- Returns a bounded (message-count AND character-budget
  limited) history window for prompt construction.
- Enforces per-user ownership on every session lookup —
  a session belonging to another user is never returned.

Responsibilities:
Chat persistence
History bounding
Session ownership enforcement

Used By:
fitness_chat.py router
fitness_chat_service.py

==================================================
"""

from sqlalchemy import desc
from fastapi import HTTPException

from app.models.chat import ChatSession, ChatMessage

# Bounding a conversation sent to Gemini: whichever limit is hit first wins,
# so a long conversation never causes unbounded prompt growth (P2.5).
MAX_HISTORY_MESSAGES = 10
MAX_HISTORY_CHARS = 4000
MAX_SESSIONS_LISTED = 20
TITLE_MAX_LEN = 60


def get_or_create_session(db, user_id: int, session_id: int | None) -> ChatSession:
    """
    Returns the requested session if it belongs to `user_id`, or creates a
    new one if session_id is None. Raises 404 (not 403) if the session
    exists but belongs to someone else — never confirms/denies existence
    of another user's data.
    """
    if session_id is not None:
        session = (
            db.query(ChatSession)
            .filter(ChatSession.id == session_id, ChatSession.user_id == user_id)
            .first()
        )
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found.")
        return session

    session = ChatSession(user_id=user_id)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def append_message(db, session: ChatSession, role: str, content: str) -> ChatMessage:
    message = ChatMessage(session_id=session.id, role=role, content=content)
    db.add(message)

    if role == "user" and not session.title:
        session.title = content[:TITLE_MAX_LEN]

    db.commit()
    db.refresh(message)
    return message


def get_bounded_history(db, session_id: int) -> list[dict]:
    """
    Returns the most recent messages for a session, bounded by both message
    count and a total character budget — whichever limit is hit first.
    Result is in chronological order, ready to drop into a prompt.
    """
    rows = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(desc(ChatMessage.id))
        .limit(MAX_HISTORY_MESSAGES)
        .all()
    )  # newest-first

    bounded = []
    total_chars = 0
    for row in rows:
        total_chars += len(row.content)
        if total_chars > MAX_HISTORY_CHARS and bounded:
            break
        bounded.append({"role": row.role, "content": row.content})

    bounded.reverse()  # chronological order
    return bounded


def list_sessions(db, user_id: int) -> list[ChatSession]:
    return (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user_id)
        .order_by(desc(ChatSession.last_message_at))
        .limit(MAX_SESSIONS_LISTED)
        .all()
    )


def get_session_with_messages(db, user_id: int, session_id: int) -> ChatSession:
    """Ownership-checked session lookup — 404 if it belongs to another user."""
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == user_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found.")
    return session


def get_most_recent_session(db, user_id: int) -> ChatSession | None:
    return (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user_id)
        .order_by(desc(ChatSession.last_message_at))
        .first()
    )
