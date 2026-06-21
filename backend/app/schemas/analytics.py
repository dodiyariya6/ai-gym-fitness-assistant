# app/schemas/analytics.py
"""
==================================================
AI Gym & Fitness Assistant

File: analytics.py

Purpose:
Defines Pydantic schemas used for analytics,
dashboard insights and trend visualizations.

Functionality:
- Defines daily comparison metrics.
- Defines workout trend data structures.
- Defines recent activity records.
- Defines analytics response formats.
- Standardizes dashboard analytics data.
- Supports charts, insights and AI suggestions.

Data Models:
DailyComparison
WorkoutTrendPoint
ActivityItem
AnalyticsResponse

Used By:
analytics_service.py
analytics.py router
Dashboard
Reports system
AI Wellness Score

==================================================
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class DailyComparison(BaseModel):
    """
    Trend direction for each tracked metric.
    Values: "up" | "down" | "neutral" | None
    None means no previous entry exists — no arrow should be rendered.
    """

    total_workouts: Optional[str] = None
    total_reps: Optional[str] = None
    avg_form_score: Optional[str] = None
    total_steps: Optional[str] = None
    avg_sleep: Optional[str] = None
    avg_water: Optional[str] = None
    workout_completion_rate: Optional[str] = None


class WorkoutTrendPoint(BaseModel):
    day: str
    workouts: int


class ActivityItem(BaseModel):
    title: str
    time: str
    type: str


class AnalyticsResponse(BaseModel):
    total_workouts: int
    total_reps: int
    avg_form_score: float
    total_steps: int
    avg_sleep: float
    avg_water: float
    workout_completion_rate: float
    current_streak: int
    health_score: int
    daily_comparison: DailyComparison
    workout_trend: List[WorkoutTrendPoint]
    recent_activity: List[ActivityItem]
    ai_suggestions: List[str]
