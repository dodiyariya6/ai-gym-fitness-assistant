# app/services/fitness_chat_service.py
"""
==================================================
AI Gym & Fitness Assistant

File: fitness_chat_service.py

Purpose:
Provides AI-powered fitness conversations
using Google Gemini.

Functionality:
- Accepts user fitness questions.
- Generates AI fitness guidance.
- Generates nutrition suggestions.
- Returns concise responses.
- Handles AI service failures gracefully.

Responsibilities:
AI conversations
Fitness guidance
Nutrition guidance
Response generation

Used By:
fitness_chat.py router
Fitness Chat page
Virtual Gym Buddy

==================================================
"""

from app.services.gemini_service import llm


def ask_fitness_chatbot(message: str):

    prompt = f"""
You are an expert fitness trainer and nutrition coach.

Answer the user's question accurately.

Keep answers practical and concise.

User Question:

{message}
"""

    try:

        response = llm.invoke(prompt)

        return response.content

    except Exception as e:

        print("Fitness Chat Error:", e)

        return "AI service is temporarily unavailable. Please try again later."
