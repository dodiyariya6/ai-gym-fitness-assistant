# app/schemas/fitness_chat.py
"""
==================================================
IFA — Intelligent Fitness Assistant

File: fitness_chat.py

Purpose:
Defines Pydantic schemas used for AI fitness
chatbot requests and responses.

Functionality:
- Validates user chat messages.
- Defines chatbot response formats.
- Standardizes data exchanged between backend and frontend.
- Supports AI-powered fitness conversations.

Data Models:
ChatRequest
ChatResponse

Used By:
fitness_chat_service.py
fitness_chat.py router
Fitness Chat page
Virtual Gym Buddy

==================================================
"""

from typing import Optional

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):

    # max_length matches the 1000-char truncation already enforced in
    # fitness_chat_service._sanitize_input — reject oversized payloads
    # up front with a 422 instead of silently truncating them later.
    message: str = Field(min_length=1, max_length=1000)

    # Omit to start a new conversation; pass the id returned by a previous
    # /fitness/chat call to continue it. Ownership is enforced server-side
    # (see chat_service.get_or_create_session) — a session_id belonging to
    # another user is rejected, not silently reassigned.
    session_id: Optional[int] = None


class ChatResponse(BaseModel):

    reply: str
    session_id: int
