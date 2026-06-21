# app/services/workout_service.py
"""
==================================================
AI Gym & Fitness Assistant

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


_MET_TABLE = {
    "squat": 5.0,
    "bench press": 3.8,
    "deadlift": 6.0,
    "pull up": 8.0,
    "push up": 3.8,
    "pushup": 3.8,
    "lunge": 4.0,
    "curl": 3.0,
    "bicep curl": 3.0,
    "shoulder press": 4.0,
    "row": 4.5,
    "plank": 3.0,
    "jumping jack": 8.0,
    "run": 9.0,
    "running": 9.0,
    "cycling": 7.5,
    "default": 4.0,
}

_DEFAULT_BODY_WEIGHT_KG = 70


def _estimate_calories(exercise_name: str, duration_raw) -> int:
    """
    Estimate calories burned.

    Supports:

    35
    "35"
    "35 min"
    "45 mins"
    "51 sec"
    """

    if duration_raw is None:
        return 0

    duration_str = str(duration_raw).lower().strip()

    digits = "".join(c for c in duration_str if c.isdigit())

    if not digits:

        return 0

    value = int(digits)

    if "sec" in duration_str:

        duration_minutes = value / 60

    else:

        duration_minutes = value

    if duration_minutes <= 0:

        return 0

    name_lower = (exercise_name or "").lower()

    met = _MET_TABLE["default"]

    for key, met_value in _MET_TABLE.items():

        if key in name_lower:

            met = met_value

            break

    calories = met * 3.5 * _DEFAULT_BODY_WEIGHT_KG * duration_minutes / 200

    return max(1, round(calories))


def _normalise_duration(duration_raw) -> str:
    """
    Standardise duration.

    Manual:

    35

    →

    35 min

    Webcam:

    51 sec

    →

    51 sec

    3 mins

    →

    3 min
    """

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
    Persist a workout.

    Manual workout:

    form_score → NULL

    Webcam workout:

    form_score → saved

    Calories are auto-calculated.

    Duration is preserved.
    """

    normalised_duration = _normalise_duration(workout_data.duration)

    calculated_calories = _estimate_calories(
        workout_data.exercise_name,
        workout_data.duration,
    )

    form_score = getattr(
        workout_data,
        "form_score",
        None,
    )

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


def get_user_workouts(db, user_id):

    return (
        db.query(Workout)
        .filter(Workout.user_id == user_id)
        .order_by(Workout.created_at.desc())
        .all()
    )
