# app/schemas/profile.py
"""
==================================================
AI Gym & Fitness Assistant

File: profile.py

Purpose:
Defines Pydantic schemas used for user profile
management and AI-generated health targets.

Functionality:
- Validates profile creation data.
- Validates profile update data.
- Defines profile response structures.
- Defines personalized target response formats.
- Standardizes data exchanged between backend and frontend.

Data Models:
ProfileCreate
ProfileUpdate
ProfileResponse
TargetsResponse

Used By:
profile_service.py
profile.py router
Profile page
Dietician page
Habits page
Dashboard
Reports system
Gym Finder

==================================================
"""

from pydantic import BaseModel
from typing import Optional, List


class ProfileCreate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    fitness_goals: Optional[List[str]] = None
    activity_level: Optional[str] = None


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    fitness_goals: Optional[List[str]] = None
    activity_level: Optional[str] = None


class ProfileResponse(BaseModel):
    id: int
    user_id: int
    email: Optional[str] = None
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    fitness_goals: Optional[List[str]] = None
    activity_level: Optional[str] = None
    water_goal: Optional[float] = None
    sleep_goal: Optional[float] = None
    step_goal: Optional[int] = None
    calorie_goal: Optional[int] = None

    class Config:
        from_attributes = True


class TargetsResponse(BaseModel):
    water_goal: float
    sleep_goal: float
    step_goal: int
    calorie_goal: int
    bmi: float
    bmi_category: str
    bmr: float
    tdee: float
    reasoning: dict
