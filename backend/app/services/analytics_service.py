# app/services/analytics_service.py
"""
==================================================
AI Gym & Fitness Assistant

File: analytics_service.py

Purpose:
Generates dashboard analytics, trends, wellness
scores and personalized fitness insights.

Functionality:
- Calculates workout statistics.
- Calculates habit statistics.
- Generates trend indicators.
- Builds chart data.
- Generates recent activity.
- Calculates wellness scores.
- Generates AI suggestions.
- Returns analytics data for the dashboard.

Responsibilities:
Dashboard analytics
Trend analysis
Wellness scoring
Recent activity generation
Personalized suggestions

Used By:
analytics.py router
Dashboard
Reports system
AI Wellness Score

==================================================
"""

from datetime import date, timedelta
from sqlalchemy import func, desc, cast, Date

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


def get_user_analytics(db, user_id):

    profile = get_profile(db, user_id)

    total_workouts = db.query(Workout).filter(Workout.user_id == user_id).count()

    total_reps = (
        db.query(func.sum(Workout.reps)).filter(Workout.user_id == user_id).scalar()
    ) or 0

    avg_form_score = (
        db.query(func.avg(Workout.form_score))
        .filter(
            Workout.user_id == user_id,
            Workout.form_score.isnot(None),
        )
        .scalar()
    )

    avg_form = round(float(avg_form_score), 2) if avg_form_score is not None else 0

    total_steps = (
        db.query(func.sum(Habit.steps)).filter(Habit.user_id == user_id).scalar()
    ) or 0

    avg_sleep = (
        db.query(func.avg(Habit.sleep_hours)).filter(Habit.user_id == user_id).scalar()
    ) or 0

    avg_water = (
        db.query(func.avg(Habit.water_intake)).filter(Habit.user_id == user_id).scalar()
    ) or 0

    habit_logs = db.query(Habit).filter(Habit.user_id == user_id).count()

    avg_sleep_f = round(float(avg_sleep), 2)
    avg_water_f = round(float(avg_water), 2)

    today = date.today()
    week_start = today - timedelta(days=6)  # rolling 7-day window

    # POSTGRES CAST FIX:
    # Workout.workout_date and Habit.date are stored as character varying
    # (VARCHAR) in the PostgreSQL database.  Comparing a VARCHAR column
    # against a Python date object without an explicit cast causes PostgreSQL
    # to raise:
    #   "operator does not exist: character varying >= date"
    # because PostgreSQL has no implicit coercion between the two types.
    #
    # Fix: wrap every date-range filter on these two columns with
    # cast(<column>, Date), which tells PostgreSQL to interpret the stored
    # string as a DATE value before performing the comparison.  The Python
    # date objects on the right-hand side are then correctly compared as dates.
    #
    # str() conversion is also applied to week_start / today on the RHS so the
    # bound parameter is always sent as an ISO-8601 string — the format that
    # PostgreSQL's DATE cast expects — regardless of SQLAlchemy dialect.

    days_logged_this_week = (
        db.query(func.count(func.distinct(Habit.date)))
        .filter(
            Habit.user_id == user_id,
            cast(Habit.date, Date) >= week_start,
            cast(Habit.date, Date) <= today,
        )
        .scalar()
    ) or 0

    workout_completion_rate = round((days_logged_this_week / 7) * 100, 2)

    last_two_workouts = (
        db.query(Workout)
        .filter(Workout.user_id == user_id)
        .order_by(desc(Workout.id))
        .limit(2)
        .all()
    )

    reps_trend = None
    form_trend = None
    workouts_trend = None

    if len(last_two_workouts) >= 2:
        reps_trend = _trend_direction(
            last_two_workouts[0].reps,
            last_two_workouts[1].reps,
        )
        if (
            last_two_workouts[0].form_score is not None
            and last_two_workouts[1].form_score is not None
        ):
            form_trend = _trend_direction(
                last_two_workouts[0].form_score,
                last_two_workouts[1].form_score,
            )

    if total_workouts >= 2:
        workouts_trend = "up"
    elif total_workouts == 1:
        workouts_trend = "neutral"

    last_two_habits = (
        db.query(Habit)
        .filter(Habit.user_id == user_id)
        .order_by(desc(Habit.date))
        .limit(2)
        .all()
    )

    steps_trend = None
    sleep_trend = None
    water_trend = None

    if len(last_two_habits) >= 2:
        steps_trend = _trend_direction(
            last_two_habits[0].steps,
            last_two_habits[1].steps,
        )
        sleep_trend = _trend_direction(
            last_two_habits[0].sleep_hours,
            last_two_habits[1].sleep_hours,
        )
        water_trend = _trend_direction(
            last_two_habits[0].water_intake,
            last_two_habits[1].water_intake,
        )

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

    # ISSUE 2 FIX: filter by the latest 7-day window instead of using .limit(7)
    # which previously returned the first 7 workout dates ever recorded.
    # Now always shows the freshest 7 days relative to today.
    # cast(Workout.workout_date, Date) applied — see POSTGRES CAST FIX above.
    chart_rows = (
        db.query(
            Workout.workout_date,
            func.count(Workout.id).label("workouts"),
        )
        .filter(
            Workout.user_id == user_id,
            cast(Workout.workout_date, Date) >= week_start,
            cast(Workout.workout_date, Date) <= today,
        )
        .group_by(Workout.workout_date)
        .order_by(Workout.workout_date)
        .all()
    )

    workout_trend = [
        {"day": str(row.workout_date), "workouts": row.workouts} for row in chart_rows
    ]

    # DATA SYNC FIX: 7-day rolling averages for Dashboard KPI cards and hero pills.
    # cast(Habit.date, Date) applied — see POSTGRES CAST FIX above.
    # Divides by the count of days actually logged in the window, not by 7,
    # so unlogged days do not deflate the averages.
    recent_habits_7d = (
        db.query(Habit)
        .filter(
            Habit.user_id == user_id,
            cast(Habit.date, Date) >= week_start,
            cast(Habit.date, Date) <= today,
        )
        .all()
    )

    habit_count_7d = len(recent_habits_7d)

    # Avg Daily Steps — last 7 calendar days, divided by days actually logged.
    # Returns 0 only when there are genuinely no habit records at all.
    avg_daily_steps_7d = (
        round(sum(h.steps for h in recent_habits_7d) / habit_count_7d)
        if habit_count_7d > 0
        else 0
    )

    # Avg Daily Water — last 7 calendar days, divided by days actually logged.
    # Returns 0 only when there are genuinely no habit records at all.
    avg_daily_water_7d = (
        round(
            sum(float(h.water_intake) for h in recent_habits_7d) / habit_count_7d,
            1,
        )
        if habit_count_7d > 0
        else 0
    )

    # Avg Daily Sleep — last 7 calendar days, divided by days actually logged.
    # Returns 0 only when there are genuinely no habit records at all.
    avg_daily_sleep_7d = (
        round(
            sum(float(h.sleep_hours) for h in recent_habits_7d) / habit_count_7d,
            2,
        )
        if habit_count_7d > 0
        else 0
    )

    # Reports KPI: overall average steps across ALL habit logs — not capped to
    # 7 days.  Divides total lifetime steps by total number of habit records,
    # giving a stable long-term activity benchmark for the Reports page.
    overall_avg_daily_steps = round(total_steps / habit_logs) if habit_logs > 0 else 0

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
        recent_activity.append(
            {
                "title": (
                    f"Workout logged — {w.exercise_name}, "
                    f"{w.reps} reps"
                    f"{form_part}"
                ),
                "time": str(w.workout_date),
                "type": "workout",
            }
        )

    for h in recent_habits:
        recent_activity.append(
            {
                "title": (
                    f"Habit logged — {h.steps:,} steps, " f"{h.sleep_hours} hrs sleep"
                ),
                "time": str(h.date),
                "type": "habit",
            }
        )

    recent_activity.sort(key=lambda x: x["time"], reverse=True)
    recent_activity = recent_activity[:5]

    logged_dates = sorted(
        {h.date for h in db.query(Habit).filter(Habit.user_id == user_id).all()}
    )

    current_streak = 0

    if logged_dates:
        # logged_dates contains strings (VARCHAR) — compare against str(today)
        # so the while-loop does not fail on type mismatch.
        check_date = str(date.today())
        while check_date in logged_dates:
            current_streak += 1
            # Step back one calendar day as a string for consistent comparison.
            check_date = str(date.fromisoformat(check_date) - timedelta(days=1))

    has_any_data = total_workouts > 0 or habit_logs > 0

    if not has_any_data:
        health_score = 0

    else:
        wellness_score = 0

        # Sleep (25)
        if avg_sleep_f >= 7:
            wellness_score += 25
        else:
            wellness_score += max(0, 25 - (7 - avg_sleep_f) * 3)

        # Water (20)
        wellness_score += min(20, (avg_water_f / 2) * 20)

        # Average daily steps (15)
        avg_daily_steps = (total_steps / habit_logs) if habit_logs else 0
        if avg_daily_steps >= 6000:
            wellness_score += 15
        else:
            wellness_score += (avg_daily_steps / 6000) * 15

        # Workout completion (10)
        if workout_completion_rate >= 70:
            wellness_score += 10

        # Form score (20)
        if avg_form:
            wellness_score += (avg_form / 100) * 20

        # Streak (10)
        if current_streak >= 7:
            wellness_score += 10
        elif current_streak >= 4:
            wellness_score += 7
        elif current_streak >= 1:
            wellness_score += 4

        health_score = round(min(100, wellness_score))

    water_target = profile.water_goal if profile and profile.water_goal else 2.0
    sleep_target = profile.sleep_goal if profile and profile.sleep_goal else 7.0
    step_target = profile.step_goal if profile and profile.step_goal else 10_000
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

    return {
        "total_workouts": total_workouts,
        "total_reps": total_reps,
        "avg_form_score": avg_form,
        "total_steps": total_steps,
        "avg_sleep": avg_sleep_f,
        "avg_water": avg_water_f,
        # weekly goal: days logged this week ÷ 7, capped at 100%
        "workout_completion_rate": workout_completion_rate,
        "health_score": health_score,
        "daily_comparison": daily_comparison,
        "workout_trend": workout_trend,
        "recent_activity": recent_activity,
        "ai_suggestions": suggestions,
        "current_streak": current_streak,
        # Dashboard KPI cards and hero pills: 7-day rolling averages.
        # Denominator = days actually logged in the window, not 7.
        "avg_daily_steps_7d": avg_daily_steps_7d,
        "avg_daily_water_7d": avg_daily_water_7d,
        "avg_daily_sleep_7d": avg_daily_sleep_7d,
        # Reports KPI: overall average across ALL habit logs (long-term view).
        "overall_avg_daily_steps": overall_avg_daily_steps,
    }


def get_habit_trends(db, user_id):
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
