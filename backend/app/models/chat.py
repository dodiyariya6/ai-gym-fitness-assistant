# app/models/chat.py
"""
==================================================
IFA — Intelligent Fitness Assistant

File: chat.py

Purpose:
Defines the ChatSession and ChatMessage database
models used to persist AI fitness coach conversations,
so chat history survives page reloads and can be used
as bounded context for follow-up questions.

Functionality:
- Groups messages into sessions, one user per session.
- Stores each message's role (user/assistant) and text.
- Tracks session creation and last-activity time for
  ordering and eventual pruning.

Database Tables:
chat_sessions
chat_messages

Used By:
chat_service.py
fitness_chat.py router

==================================================
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Short label for the session — first ~60 chars of the first user
    # message. Purely cosmetic; not used for any lookup logic.
    title = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_message_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    messages = relationship(
        "ChatMessage",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="ChatMessage.id",
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False, index=True)

    role = Column(String, nullable=False)  # "user" | "assistant"
    content = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("ChatSession", back_populates="messages")
