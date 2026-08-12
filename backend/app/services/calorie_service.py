# app/services/calorie_service.py
"""
==================================================
IFA — Intelligent Fitness Assistant

File: calorie_service.py

Purpose:
Provides the MET-based calorie estimation formula
used by manual workout logging.

Functionality:
- Maps exercise names to MET (Metabolic Equivalent) values.
- Estimates calories burned from exercise, duration and body weight.

Responsibilities:
Calorie estimation

Used By:
workout_service.py   (manual workout logging)

Note: the AI Webcam Trainer runs entirely client-side (see
frontend/src/utils/exerciseCounters.js) and ports this exact MET table/
formula to JS rather than calling this module — see that file's docstring
for why (a deployed backend has no access to a visitor's camera).

==================================================
"""

MET_TABLE = {
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

DEFAULT_BODY_WEIGHT_KG = 70.0


def estimate_calories(exercise_name: str, duration_raw, body_weight: float = None) -> int:
    """
    Estimate calories burned using the MET formula. Uses the user's real
    body weight when available, otherwise DEFAULT_BODY_WEIGHT_KG.

    duration_raw may be a string like "45 sec" / "12 min", or a bare number
    of minutes — anything workout_service's manual-entry flow or
    pose_service's webcam session summary already produces.
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
    met = MET_TABLE["default"]

    for key, met_value in MET_TABLE.items():
        if key in name_lower:
            met = met_value
            break

    weight = body_weight if (body_weight and body_weight > 0) else DEFAULT_BODY_WEIGHT_KG
    calories = met * 3.5 * weight * duration_minutes / 200

    return max(1, round(calories))
