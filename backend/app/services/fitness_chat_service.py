# app/services/fitness_chat_service.py
"""
==================================================
IFA — Intelligent Fitness Assistant

File: fitness_chat_service.py

Purpose:
Provides AI-powered fitness conversations
using Google Gemini.

Functionality:
- Accepts user fitness questions.
- Grounds every answer in the user's real, already-
  computed fitness context (goals, recent workouts,
  habits, wellness state) via context_service.
- Reasons from a bounded recent-conversation window
  instead of answering as a stateless, generic chatbot.
- Generates AI fitness guidance and nutrition suggestions.
- Returns concise responses.
- Handles AI service failures gracefully.

Responsibilities:
AI conversations
Contextual coaching
Fitness guidance
Nutrition guidance
Response generation

Used By:
fitness_chat.py router
Fitness Chat page
Virtual Gym Buddy

==================================================
"""

import re

from app.services.context_service import build_user_context
from app.services.gemini_service import safe_invoke, AIUnavailableError


def _sanitize_input(text: str) -> str:
    """
    Sanitize user message against common prompt injection patterns.
    """
    if not text:
        return ""
    # Truncate overly long inputs to 1000 characters
    cleaned = text[:1000].strip()
    # Neutralize instruction override patterns
    cleaned = re.sub(r"(?i)(system prompt|ignore previous instructions|disregard instructions|you are now)", "[filtered]", cleaned)
    return cleaned


def _format_history(history: list[dict] | None) -> str:
    """Renders the bounded history window (see chat_service.get_bounded_history)
    as a short transcript. Already size-bounded upstream — never grows
    unbounded prompts."""
    if not history:
        return "(no prior messages in this conversation)"
    lines = []
    for turn in history:
        speaker = "User" if turn.get("role") == "user" else "Coach"
        lines.append(f"{speaker}: {turn.get('content', '')}")
    return "\n".join(lines)


_COACH_PROMPT_TEMPLATE = """You are FitAI's personal fitness coach for ONE specific user. You are given
that user's real, already-computed fitness context below — reason from
their actual recent workouts, habits and wellness state instead of giving
generic advice. If the context shows no history yet, say so plainly
instead of assuming any exists.

Answer the user's question accurately, safely and concisely. If the
question is unrelated to fitness, health, or nutrition, politely decline
to answer. This is a fitness assistant, not a medical service — avoid
definitive medical claims and suggest professional consultation for
medical concerns.

USER CONTEXT:
{context_block}

RECENT CONVERSATION:
{history_block}

User's new question:
{message}
"""


async def ask_fitness_chatbot(db, user_id: int, message: str, history: list[dict] | None = None) -> str:
    sanitized_message = _sanitize_input(message)
    if not sanitized_message:
        return "Please enter a valid fitness question."

    context = build_user_context(db, user_id)

    prompt = _COACH_PROMPT_TEMPLATE.format(
        context_block=context.to_prompt_context(),
        history_block=_format_history(history),
        message=sanitized_message,
    )

    try:
        return await safe_invoke(prompt)
    except AIUnavailableError:
        return "AI service is temporarily unavailable. Please try again later."
