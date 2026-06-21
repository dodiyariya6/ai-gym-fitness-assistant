# app/routers/fitness_chat.py
"""
==================================================
AI Gym & Fitness Assistant

File: fitness_chat.py

Purpose:
Defines API endpoints for the AI-powered fitness
chatbot that provides personalized fitness guidance.

Functionality:
- Accepts user fitness-related queries.
- Generates AI-powered responses.
- Provides workout and wellness guidance.
- Returns structured chatbot replies.

API Base Route:
/fitness

Used By:
Fitness Chat page
fitness_chat_service.py
Virtual Gym Buddy

==================================================
"""

from fastapi import APIRouter

from app.schemas.fitness_chat import ChatRequest, ChatResponse

from app.services.fitness_chat_service import ask_fitness_chatbot

router = APIRouter(prefix="/fitness", tags=["Fitness Chatbot"])


@router.post("/chat", response_model=ChatResponse)
def fitness_chat(request: ChatRequest):

    reply = ask_fitness_chatbot(request.message)

    return {"reply": reply}
