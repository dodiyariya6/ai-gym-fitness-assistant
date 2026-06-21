# app/schemas/consistency.py
"""
==================================================
AI Gym & Fitness Assistant

File: consistency.py

Purpose:
Defines Pydantic schemas used for consistency
tracking and streak analytics.

Functionality:
- Defines daily consistency records.
- Tracks streak statistics.
- Calculates weekly and monthly consistency.
- Stores successful day counts.
- Provides daily performance breakdowns.
- Standardizes consistency data exchanged between backend and frontend.

Data Models:
DailyConsistencyEntry
ConsistencyResponse

Used By:
consistency_service.py
consistency.py router
Dashboard
AI Consistency Tracker
Reports system

==================================================
"""

from typing import List
from pydantic import BaseModel


class DailyConsistencyEntry(BaseModel):
    date: str
    water_met: bool
    sleep_met: bool
    steps_met: bool
    workout_met: bool
    score: int
    rating: str


class ConsistencyResponse(BaseModel):
    current_streak: int
    longest_streak: int
    weekly_consistency_pct: float
    monthly_consistency_pct: float
    successful_days: int
    daily_breakdown: List[DailyConsistencyEntry]
    using_profile_targets: bool
