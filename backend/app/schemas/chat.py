# app/schemas/chat.py
"""
==================================================
IFA — Intelligent Fitness Assistant

File: chat.py  (schemas)

Purpose:
Defines Pydantic schemas for persisted AI fitness
coach conversations (sessions + messages).

Data Models:
ChatMessageResponse
ChatSessionResponse
ChatSessionListItem

Used By:
chat_service.py
fitness_chat.py router

==================================================
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSessionListItem(BaseModel):
    id: int
    title: Optional[str] = None
    created_at: datetime
    last_message_at: datetime

    class Config:
        from_attributes = True


class ChatSessionResponse(BaseModel):
    id: int
    title: Optional[str] = None
    created_at: datetime
    last_message_at: datetime
    messages: List[ChatMessageResponse] = []

    class Config:
        from_attributes = True
