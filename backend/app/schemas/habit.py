# app/schemas/habit.py
"""
==================================================
AI Gym & Fitness Assistant

File: habit.py

Purpose:
Defines Pydantic schemas used for validating
daily habit tracking data.

Functionality:
- Validates habit logging inputs.
- Defines habit response structures.
- Validates water, sleep and step values.
- Tracks workout completion status.
- Standardizes data exchanged between backend and frontend.

Data Models:
HabitCreate
HabitResponse

Used By:
habit_service.py
habit.py router
Habits page
Dashboard
AI Wellness Score
AI Consistency Tracker

==================================================
"""

from datetime import date

from pydantic import BaseModel, Field


class HabitCreate(BaseModel):

    water_intake: float = Field(ge=0)

    sleep_hours: float = Field(ge=0)

    steps: int = Field(ge=0)

    workout_done: bool

    date: date


class HabitResponse(BaseModel):

    id: int

    water_intake: float

    sleep_hours: float

    steps: int

    workout_done: bool

    date: date

    class Config:

        from_attributes = True
