# app/services/analytics_service.py
"""
==================================================
IFA — Intelligent Fitness Assistant

File: analytics_service.py

Purpose:
Generates dashboard analytics, trends, wellness
scores and personalized fitness insights.
==================================================
"""

from datetime import date, timedelta
from sqlalchemy import func, desc

from app.models.workout import Workout
from app.models.habit import Habit
from app.services.profile_service import get_profile


def _trend_direction(latest, previous):
    if latest is None or previous is None:
        return None
    if latest > previous:
        return "up"
    if latest < previous:
        return "down"
    return "neutral"


def _get_workout_metrics(db, user_id: int):
    """Aggregate total workouts, total reps, and average form score in batched queries."""
    total_workouts = db.query(Workout).filter(Workout.user_id == user_id).count()

    stats = (
        db.query(
            func.coalesce(func.sum(Workout.reps), 0).label("total_reps"),
            func.avg(Workout.form_score).label("avg_form"),
        )
        .filter(Workout.user_id == user_id)
        .first()
    )

    total_reps = int(stats.total_reps) if stats else 0
    avg_form = round(float(stats.avg_form), 2) if (stats and stats.avg_form is not None) else 0

    return total_workouts, total_reps, avg_form


def _get_habit_metrics(db, user_id: int):
    """Aggregate lifetime habit metrics in a single query."""
    stats = (
        db.query(
            func.count(Habit.id).label("habit_logs"),
            func.coalesce(func.sum(Habit.steps), 0).label("total_steps"),
            func.coalesce(func.avg(Habit.sleep_hours), 0.0).label("avg_sleep"),
            func.coalesce(func.avg(Habit.water_intake), 0.0).label("avg_water"),
        )
        .filter(Habit.user_id == user_id)
        .first()
    )

    habit_logs = stats.habit_logs if stats else 0
    total_steps = int(stats.total_steps) if stats else 0
    avg_sleep_f = round(float(stats.avg_sleep), 2) if stats else 0.0
    avg_water_f = round(float(stats.avg_water), 2) if stats else 0.0

    return habit_logs, total_steps, avg_sleep_f, avg_water_f


def _get_rolling_7d_habits(db, user_id: int, week_start: date, today: date):
    """Fetch 7-day rolling habit metrics."""
    recent_habits_7d = (
        db.query(Habit)
        .filter(
            Habit.user_id == user_id,
            Habit.date >= week_start,
            Habit.date <= today,
        )
        .all()
    )

    habit_count_7d = len(recent_habits_7d)

    avg_daily_steps_7d = (
        round(sum(h.steps for h in recent_habits_7d) / habit_count_7d)
        if habit_count_7d > 0
        else 0
    )
    avg_daily_water_7d = (
        round(sum(float(h.water_intake) for h in recent_habits_7d) / habit_count_7d, 1)
        if habit_count_7d > 0
        else 0.0
    )
    avg_daily_sleep_7d = (
        round(sum(float(h.sleep_hours) for h in recent_habits_7d) / habit_count_7d, 2)
        if habit_count_7d > 0
        else 0.0
    )

    days_logged_this_week = len({h.date for h in recent_habits_7d})
    workout_completion_rate = round((days_logged_this_week / 7) * 100, 2)

    return (
        avg_daily_steps_7d,
        avg_daily_water_7d,
        avg_daily_sleep_7d,
        days_logged_this_week,
        workout_completion_rate,
    )


def _compute_current_streak(db, user_id: int) -> int:
    """Compute active habit logging streak using recent dates."""
    dates_rows = (
        db.query(Habit.date)
        .filter(Habit.user_id == user_id)
        .order_by(desc(Habit.date))
        .limit(60)
        .all()
    )
    logged_dates = {r[0] for r in dates_rows}

    current_streak = 0
    if logged_dates:
        check_date = date.today()
        while check_date in logged_dates:
            current_streak += 1
            check_date -= timedelta(days=1)

    return current_streak


def _compute_wellness_breakdown(
    has_any_data: bool,
    avg_sleep_f: float,
    avg_water_f: float,
    avg_daily_steps: float,
    workout_completion_rate: float,
    avg_form: float,
    current_streak: int,
) -> dict:
    """
    Per-component point breakdown feeding the 0-100 wellness score.
    Exposing the intermediate values (P2.11 "wellness score explanation")
    lets Reports/Dashboard/AI insights explain *why* the score is what it
    is, without changing what it computes to — the formulas, order and
    thresholds below are copied verbatim from the original single-function
    implementation, and _compute_wellness_score() sums this dict in the
    same insertion order, so the total is unchanged.
    """
    if not has_any_data:
        return {
            "sleep": 0.0,
            "water": 0.0,
            "steps": 0.0,
            "workout_completion": 0.0,
            "form": 0.0,
            "streak": 0.0,
        }

    breakdown = {}

    # Sleep (25 pts)
    if avg_sleep_f >= 7:
        breakdown["sleep"] = 25.0
    else:
        breakdown["sleep"] = max(0.0, 25.0 - (7.0 - avg_sleep_f) * 3.0)

    # Water (20 pts)
    breakdown["water"] = min(20.0, (avg_water_f / 2.0) * 20.0)

    # Steps (15 pts)
    if avg_daily_steps >= 6000:
        breakdown["steps"] = 15.0
    else:
        breakdown["steps"] = (avg_daily_steps / 6000.0) * 15.0

    # Workout completion (10 pts)
    breakdown["workout_completion"] = 10.0 if workout_completion_rate >= 70 else 0.0

    # Form score (20 pts)
    breakdown["form"] = (avg_form / 100.0) * 20.0 if avg_form else 0.0

    # Streak (10 pts)
    if current_streak >= 7:
        breakdown["streak"] = 10.0
    elif current_streak >= 4:
        breakdown["streak"] = 7.0
    elif current_streak >= 1:
        breakdown["streak"] = 4.0
    else:
        breakdown["streak"] = 0.0

    return breakdown


def _compute_wellness_score(breakdown: dict) -> int:
    """Sums the breakdown produced by _compute_wellness_breakdown() — same
    formula, same order as the original implementation, so the total is
    byte-for-byte unchanged from before this refactor."""
    return round(min(100.0, sum(breakdown.values())))


_WELLNESS_LABELS = {
    "sleep": ("Sleep", 25),
    "water": ("Hydration", 20),
    "form": ("Workout Form", 20),
    "steps": ("Steps", 15),
    "workout_completion": ("Weekly Logging Consistency", 10),
    "streak": ("Streak Bonus", 10),
}


def _format_wellness_breakdown(breakdown: dict) -> list[dict]:
    """Display-only rounding for the API response — never fed back into the
    score calculation, so it cannot introduce rounding drift in the total."""
    return [
        {
            "component": key,
            "label": label,
            "points": round(breakdown.get(key, 0.0), 1),
            "max_points": max_points,
        }
        for key, (label, max_points) in _WELLNESS_LABELS.items()
    ]


def _generate_ai_suggestions(
    profile,
    avg_water_f: float,
    avg_sleep_f: float,
    total_steps: int,
    avg_form: float,
    workout_completion_rate: float,
    days_logged_this_week: int,
) -> list[str]:
    """Generate personalized improvement suggestions."""
    water_target = profile.water_goal if (profile and profile.water_goal) else 2.0
    sleep_target = profile.sleep_goal if (profile and profile.sleep_goal) else 7.0
    step_target = profile.step_goal if (profile and profile.step_goal) else 10_000
    has_personalized_targets = bool(
        profile and profile.water_goal and profile.sleep_goal and profile.step_goal
    )

    goal_phrase = ""
    if profile and profile.fitness_goals:
        goal_phrase = f" for your {profile.fitness_goals[0].lower()} goal"

    suggestions = []

    if avg_water_f < water_target:
        suggestions.append(
            f"Your average water intake is {avg_water_f} L, below your personalized "
            f"goal of {water_target} L{goal_phrase}. Increase intake to support recovery."
            if has_personalized_targets
            else f"Your average water intake is {avg_water_f} L. "
            "Aim for at least 2 L daily to support muscle recovery."
        )

    if avg_sleep_f < sleep_target:
        suggestions.append(
            f"You're averaging {avg_sleep_f} hrs of sleep, below your personalized "
            f"goal of {sleep_target} hrs{goal_phrase}."
            if has_personalized_targets
            else f"You're averaging {avg_sleep_f} hrs of sleep. "
            "Target 7–8 hours nightly for optimal hormonal balance."
        )

    if total_steps < step_target:
        suggestions.append(
            f"Your total step count is {total_steps:,}, below your personalized "
            f"goal of {step_target:,} steps{goal_phrase}."
            if has_personalized_targets
            else f"Your total step count is {total_steps:,}. "
            "Aim for 10,000 steps per day to maintain cardiovascular health."
        )

    if avg_form and avg_form < 85.0:
        suggestions.append(
            f"Your average form score is {avg_form}%. "
            "Focus on technique to raise it above 85% and reduce injury risk."
        )

    if workout_completion_rate < 80.0 and days_logged_this_week > 0:
        suggestions.append(
            f"Weekly habit completion is at {workout_completion_rate}%. "
            "Try to log every day this week to hit 80%."
        )

    if profile and profile.activity_level and workout_completion_rate < 50:
        suggestions.append(
            f"Your activity level is set to '{profile.activity_level}', but your "
            "weekly logging is low. Log workouts and habits consistently for more "
            "accurate AI guidance."
        )

    if not suggestions:
        suggestions.append(
            "All metrics are on track. Keep maintaining your current routine."
        )

    return suggestions


def get_user_analytics(db, user_id: int) -> dict:
    """Central dashboard analytics generator."""
    today = date.today()
    week_start = today - timedelta(days=6)

    profile = get_profile(db, user_id)
    total_workouts, total_reps, avg_form = _get_workout_metrics(db, user_id)
    habit_logs, total_steps, avg_sleep_f, avg_water_f = _get_habit_metrics(db, user_id)

    (
        avg_daily_steps_7d,
        avg_daily_water_7d,
        avg_daily_sleep_7d,
        days_logged_this_week,
        workout_completion_rate,
    ) = _get_rolling_7d_habits(db, user_id, week_start, today)

    # Compare trends
    last_two_workouts = (
        db.query(Workout)
        .filter(Workout.user_id == user_id)
        .order_by(desc(Workout.id))
        .limit(2)
        .all()
    )
    reps_trend = (
        _trend_direction(last_two_workouts[0].reps, last_two_workouts[1].reps)
        if len(last_two_workouts) >= 2
        else None
    )
    form_trend = (
        _trend_direction(last_two_workouts[0].form_score, last_two_workouts[1].form_score)
        if (len(last_two_workouts) >= 2 and last_two_workouts[0].form_score is not None and last_two_workouts[1].form_score is not None)
        else None
    )
    workouts_trend = "up" if total_workouts >= 2 else ("neutral" if total_workouts == 1 else None)

    last_two_habits = (
        db.query(Habit)
        .filter(Habit.user_id == user_id)
        .order_by(desc(Habit.date))
        .limit(2)
        .all()
    )
    steps_trend = _trend_direction(last_two_habits[0].steps, last_two_habits[1].steps) if len(last_two_habits) >= 2 else None
    sleep_trend = _trend_direction(last_two_habits[0].sleep_hours, last_two_habits[1].sleep_hours) if len(last_two_habits) >= 2 else None
    water_trend = _trend_direction(last_two_habits[0].water_intake, last_two_habits[1].water_intake) if len(last_two_habits) >= 2 else None

    completion_trend = None
    if days_logged_this_week > 0:
        if workout_completion_rate >= 80:
            completion_trend = "up"
        elif workout_completion_rate < 50:
            completion_trend = "down"
        else:
            completion_trend = "neutral"

    daily_comparison = {
        "total_workouts": workouts_trend,
        "total_reps": reps_trend,
        "avg_form_score": form_trend,
        "total_steps": steps_trend,
        "avg_sleep": sleep_trend,
        "avg_water": water_trend,
        "workout_completion_rate": completion_trend,
    }

    # Chart rows
    chart_rows = (
        db.query(
            Workout.workout_date,
            func.count(Workout.id).label("workouts"),
        )
        .filter(
            Workout.user_id == user_id,
            Workout.workout_date >= week_start,
            Workout.workout_date <= today,
        )
        .group_by(Workout.workout_date)
        .order_by(Workout.workout_date)
        .all()
    )
    workout_trend = [
        {"day": str(row.workout_date), "workouts": row.workouts} for row in chart_rows
    ]

    # Recent activity
    recent_workouts = (
        db.query(Workout)
        .filter(Workout.user_id == user_id)
        .order_by(desc(Workout.id))
        .limit(3)
        .all()
    )
    recent_habits = (
        db.query(Habit)
        .filter(Habit.user_id == user_id)
        .order_by(desc(Habit.date))
        .limit(3)
        .all()
    )

    recent_activity = []
    for w in recent_workouts:
        form_part = f", form {w.form_score}%" if w.form_score is not None else ""
        recent_activity.append({
            "title": f"Workout logged — {w.exercise_name}, {w.reps} reps{form_part}",
            "time": str(w.workout_date),
            "type": "workout",
        })
    for h in recent_habits:
        recent_activity.append({
            "title": f"Habit logged — {h.steps:,} steps, {h.sleep_hours} hrs sleep",
            "time": str(h.date),
            "type": "habit",
        })

    recent_activity.sort(key=lambda x: x["time"], reverse=True)
    recent_activity = recent_activity[:5]

    current_streak = _compute_current_streak(db, user_id)
    overall_avg_daily_steps = round(total_steps / habit_logs) if habit_logs > 0 else 0
    avg_daily_steps_lifetime = (total_steps / habit_logs) if habit_logs > 0 else 0.0

    wellness_breakdown_raw = _compute_wellness_breakdown(
        has_any_data=(total_workouts > 0 or habit_logs > 0),
        avg_sleep_f=avg_sleep_f,
        avg_water_f=avg_water_f,
        avg_daily_steps=avg_daily_steps_lifetime,
        workout_completion_rate=workout_completion_rate,
        avg_form=avg_form,
        current_streak=current_streak,
    )
    health_score = _compute_wellness_score(wellness_breakdown_raw)
    wellness_breakdown = _format_wellness_breakdown(wellness_breakdown_raw)

    suggestions = _generate_ai_suggestions(
        profile=profile,
        avg_water_f=avg_water_f,
        avg_sleep_f=avg_sleep_f,
        total_steps=total_steps,
        avg_form=avg_form,
        workout_completion_rate=workout_completion_rate,
        days_logged_this_week=days_logged_this_week,
    )

    return {
        "total_workouts": total_workouts,
        "total_reps": total_reps,
        "avg_form_score": avg_form,
        "total_steps": total_steps,
        "avg_sleep": avg_sleep_f,
        "avg_water": avg_water_f,
        "workout_completion_rate": workout_completion_rate,
        "health_score": health_score,
        "wellness_breakdown": wellness_breakdown,
        "daily_comparison": daily_comparison,
        "workout_trend": workout_trend,
        "recent_activity": recent_activity,
        "ai_suggestions": suggestions,
        "current_streak": current_streak,
        "avg_daily_steps_7d": avg_daily_steps_7d,
        "avg_daily_water_7d": avg_daily_water_7d,
        "avg_daily_sleep_7d": avg_daily_sleep_7d,
        "overall_avg_daily_steps": overall_avg_daily_steps,
    }


def get_habit_trends(db, user_id: int):
    habits = db.query(Habit).filter(Habit.user_id == user_id).order_by(Habit.date).all()
    return [
        {
            "date": str(h.date),
            "steps": h.steps,
            "sleep": h.sleep_hours,
            "water": h.water_intake,
        }
        for h in habits
    ]
