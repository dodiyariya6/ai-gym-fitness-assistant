# app/schemas/achievement.py
"""
==================================================
AI Gym & Fitness Assistant

File: achievement.py

Purpose:
Defines Pydantic schemas used for achievement
data validation and API responses.

Functionality:
- Defines individual achievement structures.
- Stores achievement metadata.
- Tracks unlock status and progress values.
- Defines achievement response formats.
- Standardizes data exchanged between backend and frontend.

Data Models:
AchievementItem
AchievementsResponse

Used By:
achievement_service.py
achievements.py router
Dashboard
AI Achievement System

==================================================
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel


class AchievementItem(BaseModel):
    key: str
    title: str
    description: str
    icon: str
    unlocked: bool
    unlocked_at: Optional[datetime] = None
    progress_current: int
    progress_target: int


class AchievementsResponse(BaseModel):
    achievements: List[AchievementItem]
    unlocked_count: int
    total_count: int
