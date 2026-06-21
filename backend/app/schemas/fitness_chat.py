# app/schemas/fitness_chat.py
"""
==================================================
AI Gym & Fitness Assistant

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

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):

    message: str = Field(min_length=1)


class ChatResponse(BaseModel):

    reply: str
