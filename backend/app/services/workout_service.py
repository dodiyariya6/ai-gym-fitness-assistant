# app/services/workout_service.py
"""
==================================================
IFA — Intelligent Fitness Assistant

File: workout_service.py

Purpose:
Provides workout management and calorie
calculation functionality.

Functionality:
- Creates workout entries.
- Retrieves workout history.
- Estimates calories burned.
- Normalizes workout durations.
- Stores AI-generated form scores.
- Supports manual and webcam workouts.

Responsibilities:
Workout management
Calorie estimation
Duration normalization
Workout persistence

Used By:
workout.py router
Workout page
Dashboard
Reports system
AI Wellness Score

==================================================
"""

from app.models.workout import Workout
from app.models.profile import Profile
from app.services.calorie_service import estimate_calories


def _normalise_duration(duration_raw) -> str:
    """Standardise duration format."""
    if duration_raw is None:
        return ""

    raw = str(duration_raw).strip()
    if not raw:
        return ""

    raw_lower = raw.lower()
    if "sec" in raw_lower:
        return raw.replace("secs", "sec")

    if "min" in raw_lower:
        return raw.replace("mins", "min")

    digits = "".join(c for c in raw if c.isdigit())
    if not digits:
        return ""

    return f"{int(digits)} min"


def create_workout(db, user_id, workout_data):
    """
    Persist a workout. Calories are estimated based on exercise MET and user body weight.
    """
    normalised_duration = _normalise_duration(workout_data.duration)

    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    body_weight = profile.weight if (profile and profile.weight) else None

    calculated_calories = estimate_calories(
        workout_data.exercise_name,
        workout_data.duration,
        body_weight=body_weight,
    )

    form_score = getattr(workout_data, "form_score", None)

    workout = Workout(
        user_id=user_id,
        exercise_name=workout_data.exercise_name,
        sets=workout_data.sets,
        reps=workout_data.reps,
        duration=normalised_duration,
        calories_burned=calculated_calories,
        form_score=form_score,
        notes=workout_data.notes,
        workout_date=workout_data.workout_date,
    )

    db.add(workout)
    db.commit()
    db.refresh(workout)

    return workout


def get_user_workouts(db, user_id, limit: int = 50, offset: int = 0):
    return (
        db.query(Workout)
        .filter(Workout.user_id == user_id)
        .order_by(Workout.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def delete_workout(db, user_id, workout_id) -> bool:
    """
    Deletes the workout if it exists and belongs to user_id — covers both
    manually-logged and webcam-generated workouts, since both are persisted
    as plain Workout rows through the same create_workout() pathway.
    Returns False (never raises) for missing/not-owned, so the router
    responds 404 either way.
    """
    workout = (
        db.query(Workout)
        .filter(Workout.id == workout_id, Workout.user_id == user_id)
        .first()
    )
    if not workout:
        return False

    db.delete(workout)
    db.commit()
    return True
