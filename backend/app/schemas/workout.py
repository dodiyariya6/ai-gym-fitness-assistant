# app/schemas/workout.py
"""
==================================================
AI Gym & Fitness Assistant

File: workout.py

Purpose:
Defines Pydantic schemas used for workout
logging and workout history responses.

Functionality:
- Validates workout logging inputs.
- Defines workout response structures.
- Supports manual workout entries.
- Supports AI-generated form scores.
- Standardizes data exchanged between backend and frontend.

Data Models:
WorkoutCreate
WorkoutResponse

Used By:
workout_service.py
workout.py router
Workout page
Dashboard
Reports system
AI Wellness Score

==================================================
"""

from typing import Optional
from pydantic import BaseModel


class WorkoutCreate(BaseModel):

    exercise_name: str

    sets: int

    reps: int

    duration: Optional[str] = None

    notes: Optional[str] = ""

    workout_date: str

    form_score: Optional[int] = None


class WorkoutResponse(BaseModel):

    id: int

    user_id: int

    exercise_name: str

    sets: int

    reps: int

    duration: Optional[str] = None

    calories_burned: int

    form_score: Optional[int] = None

    notes: Optional[str] = ""

    workout_date: str

    class Config:

        from_attributes = True
