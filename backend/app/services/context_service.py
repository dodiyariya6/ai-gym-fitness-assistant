# app/services/context_service.py
"""
==================================================
IFA — Intelligent Fitness Assistant

File: context_service.py

Purpose:
Builds the UserFitnessContext — a single, compact,
deterministic snapshot of a user's goals, progress
and behaviour, assembled from the existing analytics
and consistency layers. This is the ONLY object handed
to Gemini for coaching/insight generation; Gemini never
sees raw database rows.

Functionality:
- Reuses profile_service, analytics_service,
  consistency_service and achievement_service instead
  of duplicating their queries/logic.
- Adds a single lightweight "most recent workout"
  lookup that isn't already exposed by analytics_service.
- Sets explicit has_workout_history / has_habit_history
  flags so AI never invents history for new users.

Responsibilities:
Context assembly
AI input shaping
Deterministic summarisation

Used By:
ai_insight_service.py
fitness_chat_service.py

==================================================
"""

from sqlalchemy import desc

from app.models.workout import Workout
from app.services.profile_service import get_profile
from app.services.analytics_service import get_user_analytics
from app.services.consistency_service import get_consistency
from app.services.achievement_service import evaluate_achievements
from app.services.diet_service import calculate_bmi
from app.schemas.context import (
    UserFitnessContext,
    GoalsSummary,
    WorkoutSummary,
    HabitSummary,
    WellnessSummary,
)

# Human-readable labels for the daily_comparison trend keys, used to turn
# "up" trends into short, deterministic improvement statements.
_TREND_LABELS = {
    "total_workouts": "Total workouts",
    "total_reps": "Total reps",
    "avg_form_score": "Average form score",
    "total_steps": "Steps",
    "avg_sleep": "Average sleep",
    "avg_water": "Average water intake",
    "workout_completion_rate": "Habit logging consistency",
}


def _most_recent_workout(db, user_id: int):
    return (
        db.query(Workout)
        .filter(Workout.user_id == user_id)
        .order_by(desc(Workout.workout_date), desc(Workout.id))
        .first()
    )


def _derive_improvements(daily_comparison: dict) -> list[str]:
    improvements = []
    for key, direction in (daily_comparison or {}).items():
        if direction == "up" and key in _TREND_LABELS:
            improvements.append(f"{_TREND_LABELS[key]} is trending up.")
    return improvements[:3]


def build_user_context(db, user_id: int, first_name: str | None = None) -> UserFitnessContext:
    """
    Assembles a compact, deterministic UserFitnessContext for `user_id`.
    Every field is derived from already-computed service output — no new
    heavy queries, no duplicated analytics logic.

    `first_name` is optional — if omitted, it's derived from the user's
    Profile.name (first token) when one exists, so callers don't need to
    know where display names live.
    """
    profile = get_profile(db, user_id)

    if first_name is None and profile and profile.name:
        first_name = profile.name.strip().split(" ")[0] or None
    analytics = get_user_analytics(db, user_id)
    consistency = get_consistency(db, user_id)

    achievements_data = evaluate_achievements(db, user_id)
    recent_achievements = [
        a["title"] for a in achievements_data["achievements"] if a["unlocked"]
    ][:3]

    dc = analytics.get("daily_comparison", {}) or {}

    bmi = None
    bmi_category = None
    if profile and profile.height and profile.weight:
        bmi, bmi_category = calculate_bmi(profile.weight, profile.height)

    goals = GoalsSummary(
        fitness_goals=list(profile.fitness_goals) if (profile and profile.fitness_goals) else [],
        activity_level=profile.activity_level if profile else None,
        water_goal=profile.water_goal if profile else None,
        sleep_goal=profile.sleep_goal if profile else None,
        step_goal=profile.step_goal if profile else None,
        calorie_goal=profile.calorie_goal if profile else None,
        bmi=bmi,
        bmi_category=bmi_category,
    )

    total_workouts = analytics.get("total_workouts", 0)
    has_workout_history = total_workouts > 0

    last_workout = _most_recent_workout(db, user_id) if has_workout_history else None
    weekly_workouts = sum(p["workouts"] for p in analytics.get("workout_trend", []))

    workouts = WorkoutSummary(
        total_workouts=total_workouts,
        avg_form_score=analytics.get("avg_form_score", 0.0),
        weekly_workouts=weekly_workouts,
        last_exercise=last_workout.exercise_name if last_workout else None,
        last_workout_date=str(last_workout.workout_date) if last_workout else None,
        workouts_trend=dc.get("total_workouts"),
        form_trend=dc.get("avg_form_score"),
    )

    # daily_breakdown is capped at the last 30 entries by consistency_service,
    # but any non-empty breakdown proves at least one habit log exists.
    has_habit_history = len(consistency.get("daily_breakdown", [])) > 0

    habits = HabitSummary(
        avg_sleep_7d=analytics.get("avg_daily_sleep_7d"),
        avg_water_7d=analytics.get("avg_daily_water_7d"),
        avg_steps_7d=analytics.get("avg_daily_steps_7d"),
        logging_streak=analytics.get("current_streak", 0),
        consistency_streak=consistency.get("current_streak", 0),
        sleep_trend=dc.get("avg_sleep"),
        water_trend=dc.get("avg_water"),
        steps_trend=dc.get("total_steps"),
    )

    wellness = WellnessSummary(
        score=analytics.get("health_score", 0),
        completion_trend=dc.get("workout_completion_rate"),
    )

    weaknesses = list(analytics.get("ai_suggestions", []))[:3]
    improvements = _derive_improvements(dc)

    return UserFitnessContext(
        user_id=user_id,
        first_name=first_name,
        has_profile=profile is not None,
        has_workout_history=has_workout_history,
        has_habit_history=has_habit_history,
        goals=goals,
        workouts=workouts,
        habits=habits,
        wellness=wellness,
        recent_achievements=recent_achievements,
        weaknesses=weaknesses,
        improvements=improvements,
    )
