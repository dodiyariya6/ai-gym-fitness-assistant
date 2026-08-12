# app/routers/fitness_chat.py
"""
==================================================
IFA — Intelligent Fitness Assistant

File: fitness_chat.py

Purpose:
Defines API endpoints for the AI-powered fitness
chatbot that provides personalized fitness guidance.

Functionality:
- Accepts user fitness-related queries.
- Generates AI-powered, context-aware responses.
- Persists conversations (ChatSession/ChatMessage) so
  the coach has real memory across requests.
- Provides workout and wellness guidance.
- Returns structured chatbot replies.
- Lists and retrieves a user's own chat sessions —
  ownership-checked, never cross-user.

API Base Route:
/fitness

Used By:
Fitness Chat page
fitness_chat_service.py
chat_service.py
Virtual Gym Buddy

==================================================
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_db
from app.schemas.fitness_chat import ChatRequest, ChatResponse
from app.schemas.chat import ChatSessionListItem, ChatSessionResponse

from app.services.fitness_chat_service import ask_fitness_chatbot
from app.services import chat_service
from app.services.auth_service import get_current_user

# Same per-router Limiter pattern already used in auth.py — keeps the
# rate-limiting architecture consistent rather than introducing a new one.
limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/fitness", tags=["Fitness Chatbot"])


@router.post("/chat", response_model=ChatResponse)
@limiter.limit("20/minute")
async def fitness_chat(
    request: Request,
    chat_request: ChatRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # 404s here if session_id belongs to another user — see
    # chat_service.get_or_create_session for the ownership boundary.
    session = chat_service.get_or_create_session(db, current_user.id, chat_request.session_id)

    history = chat_service.get_bounded_history(db, session.id)
    chat_service.append_message(db, session, "user", chat_request.message)

    reply = await ask_fitness_chatbot(db, current_user.id, chat_request.message, history=history)

    chat_service.append_message(db, session, "assistant", reply)

    return {"reply": reply, "session_id": session.id}


@router.get("/sessions", response_model=list[ChatSessionListItem])
def fitness_chat_sessions(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return chat_service.list_sessions(db, current_user.id)


@router.get("/sessions/{session_id}/messages", response_model=ChatSessionResponse)
def fitness_chat_session_messages(
    session_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Ownership-checked — raises 404 if the session belongs to another user.
    return chat_service.get_session_with_messages(db, current_user.id, session_id)
