# app/services/consistency_service.py
"""
==================================================
AI Gym & Fitness Assistant

File: consistency_service.py

Purpose:
Calculates user consistency metrics, streaks
and daily performance summaries.

Functionality:
- Evaluates daily goal completion.
- Calculates current streaks.
- Calculates longest streaks.
- Calculates weekly consistency.
- Calculates monthly consistency.
- Generates daily breakdown reports.
- Uses profile targets when available.

Responsibilities:
Consistency tracking
Streak calculation
Daily evaluation
Progress analysis

Used By:
consistency.py router
Dashboard
AI Consistency Tracker
Reports system

==================================================
"""

from datetime import date, timedelta
from app.models.habit import Habit
from app.services.profile_service import get_profile

_FALLBACK_WATER_GOAL = 2.0
_FALLBACK_SLEEP_GOAL = 7.0
_FALLBACK_STEP_GOAL = 6000

SUCCESS_THRESHOLD = 3


def _as_date(value):
    """Habit.date may come back as a python date or an ISO string depending
    on driver/dialect — normalise to a date object."""
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value))


def _rating_for_score(score: int) -> str:
    if score == 4:
        return "Excellent Day"
    if score == 3:
        return "Good Day"
    if score == 2:
        return "Needs Improvement"
    return "Missed Day"


def get_consistency(db, user_id: int) -> dict:
    profile = get_profile(db, user_id)

    using_profile_targets = bool(
        profile and profile.water_goal and profile.sleep_goal and profile.step_goal
    )

    water_goal = profile.water_goal if using_profile_targets else _FALLBACK_WATER_GOAL
    sleep_goal = profile.sleep_goal if using_profile_targets else _FALLBACK_SLEEP_GOAL
    step_goal = profile.step_goal if using_profile_targets else _FALLBACK_STEP_GOAL

    habits = db.query(Habit).filter(Habit.user_id == user_id).order_by(Habit.date).all()
    daily_breakdown = []
    score_by_date = {}

    for h in habits:
        water_met = (h.water_intake or 0) >= water_goal
        sleep_met = (h.sleep_hours or 0) >= sleep_goal
        steps_met = (h.steps or 0) >= step_goal
        workout_met = bool(h.workout_done)

        score = sum([water_met, sleep_met, steps_met, workout_met])
        d = _as_date(h.date)

        score_by_date[d] = score
        daily_breakdown.append(
            {
                "date": str(d),
                "water_met": water_met,
                "sleep_met": sleep_met,
                "steps_met": steps_met,
                "workout_met": workout_met,
                "score": score,
                "rating": _rating_for_score(score),
            }
        )

    successful_dates = sorted(
        d for d, score in score_by_date.items() if score >= SUCCESS_THRESHOLD
    )
    successful_days = len(successful_dates)

    current_streak = 0
    cursor = date.today()
    if cursor not in score_by_date:
        cursor -= timedelta(days=1)
    while score_by_date.get(cursor, 0) >= SUCCESS_THRESHOLD:
        current_streak += 1
        cursor -= timedelta(days=1)
    longest_streak = 0
    run = 0
    prev_date = None
    for d in successful_dates:
        if prev_date is not None and (d - prev_date).days == 1:
            run += 1
        else:
            run = 1
        longest_streak = max(longest_streak, run)
        prev_date = d

    today = date.today()
    week_start = today - timedelta(days=6)
    month_start = today - timedelta(days=29)

    week_successful = sum(1 for d in successful_dates if week_start <= d <= today)
    month_successful = sum(1 for d in successful_dates if month_start <= d <= today)

    weekly_consistency_pct = round((week_successful / 7) * 100, 1)
    monthly_consistency_pct = round((month_successful / 30) * 100, 1)

    return {
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "weekly_consistency_pct": weekly_consistency_pct,
        "monthly_consistency_pct": monthly_consistency_pct,
        "successful_days": successful_days,
        "daily_breakdown": daily_breakdown[-30:],  # cap payload size
        "using_profile_targets": using_profile_targets,
    }
