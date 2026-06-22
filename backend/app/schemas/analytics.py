# app/schemas/analytics.py
"""
==================================================
AI Gym & Fitness Assistant

File: analytics.py  (schemas)

Purpose:
Pydantic response model for the analytics
endpoint.  Every field returned by
get_user_analytics() in analytics_service.py
MUST be declared here or FastAPI will silently
strip it from the response before it reaches
the frontend.

==================================================
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class DailyComparison(BaseModel):
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


class RecentActivityItem(BaseModel):
    title: str
    time: str
    type: str


class AnalyticsResponse(BaseModel):
    # ── Core lifetime totals ─────────────────────────────────────────────────
    total_workouts: int
    total_reps: int
    avg_form_score: float
    total_steps: int

    # ── Lifetime averages (used by Reports page) ─────────────────────────────
    avg_sleep: float
    avg_water: float

    # ── Weekly goal completion ───────────────────────────────────────────────
    workout_completion_rate: float

    # ── Wellness / health score ──────────────────────────────────────────────
    health_score: int

    # ── Trend directions (up / down / neutral / None) ────────────────────────
    daily_comparison: DailyComparison

    # ── Chart data ───────────────────────────────────────────────────────────
    workout_trend: List[WorkoutTrendPoint]

    # ── Recent activity feed ─────────────────────────────────────────────────
    recent_activity: List[RecentActivityItem]

    # ── AI suggestions ───────────────────────────────────────────────────────
    ai_suggestions: List[str]

    # ── Streak ───────────────────────────────────────────────────────────────
    current_streak: int

    # ── 7-day rolling averages (Dashboard KPI cards + hero pills) ────────────
    # BUG FIX: these three fields were missing from the schema.
    # FastAPI's response_model serialisation silently drops any key that is not
    # declared here, so the frontend received `undefined` for all three fields
    # and displayed "—" even though the service calculated real values.
    avg_daily_steps_7d: Optional[float] = None
    avg_daily_water_7d: Optional[float] = None
    avg_daily_sleep_7d: Optional[float] = None

    # ── Overall lifetime daily-step average (Reports KPI card) ───────────────
    # BUG FIX: also missing from the schema — same silent-strip problem.
    overall_avg_daily_steps: Optional[float] = None

    class Config:
        # Allow extra fields from the service layer without raising validation
        # errors, so a future addition to the service dict won't silently break
        # the endpoint until the schema is also updated.
        extra = "ignore"
