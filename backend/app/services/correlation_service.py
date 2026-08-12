# app/services/correlation_service.py
"""
==================================================
IFA — Intelligent Fitness Assistant

File: correlation_service.py

Purpose:
Deterministically detects associations between habit
metrics (sleep, water, steps) and workout performance
(form score, calories burned) using existing history.
No AI, no ML model — plain Pearson correlation over
already-stored rows, with a strict minimum-sample gate
and non-causal language.

Functionality:
- Pairs Habit and Workout rows by date.
- Requires a minimum number of matched days before
  surfacing any pattern — otherwise returns an explicit
  "not enough data yet" state instead of guessing.
- Computes Pearson's r via numpy and buckets its
  magnitude into negligible/weak/moderate/strong.
- Always phrases results as "associated with" /
  "tended to" — never implies causation.

Responsibilities:
Habit/workout pairing
Correlation calculation
Non-causal evidence generation

Used By:
ai_insight_service.py

==================================================
"""

import numpy as np

from app.models.workout import Workout
from app.models.habit import Habit

MIN_PAIRED_DAYS = 5

_PAIRS_TO_TEST = [
    ("sleep", "form_score", "Sleep", "form score"),
    ("water", "form_score", "Water intake", "form score"),
    ("steps", "calories_burned", "Steps", "calories burned"),
]


def _bucket_strength(r: float) -> str | None:
    abs_r = abs(r)
    if abs_r < 0.2:
        return None  # negligible — not worth surfacing
    if abs_r < 0.4:
        return "weak"
    if abs_r < 0.6:
        return "moderate"
    return "strong"


def _pair_by_date(db, user_id: int) -> list[dict]:
    habits = db.query(Habit).filter(Habit.user_id == user_id).all()
    workouts = (
        db.query(Workout)
        .filter(Workout.user_id == user_id, Workout.form_score.isnot(None))
        .all()
    )

    workouts_by_date: dict = {}
    for w in workouts:
        workouts_by_date.setdefault(w.workout_date, []).append(w)

    paired = []
    for h in habits:
        day_workouts = workouts_by_date.get(h.date)
        if not day_workouts:
            continue
        paired.append(
            {
                "sleep": float(h.sleep_hours or 0),
                "water": float(h.water_intake or 0),
                "steps": float(h.steps or 0),
                "form_score": sum(w.form_score for w in day_workouts) / len(day_workouts),
                "calories_burned": sum(w.calories_burned for w in day_workouts)
                / len(day_workouts),
            }
        )
    return paired


def analyze_habit_workout_correlation(db, user_id: int) -> list[dict]:
    """
    Returns a list of correlation findings. Always includes an explicit
    "insufficient_data" or "no_meaningful_pattern" entry when nothing
    meaningful can be claimed — never manufactures a pattern.
    """
    paired = _pair_by_date(db, user_id)

    if len(paired) < MIN_PAIRED_DAYS:
        return [
            {
                "status": "insufficient_data",
                "matched_days": len(paired),
                "required_days": MIN_PAIRED_DAYS,
                "evidence": (
                    f"Only {len(paired)} day(s) have both a habit log and a "
                    "workout with a form score — at least "
                    f"{MIN_PAIRED_DAYS} are needed before a meaningful "
                    "pattern can be surfaced."
                ),
            }
        ]

    findings = []
    for x_key, y_key, x_label, y_label in _PAIRS_TO_TEST:
        xs = np.array([p[x_key] for p in paired], dtype=float)
        ys = np.array([p[y_key] for p in paired], dtype=float)

        if np.std(xs) == 0 or np.std(ys) == 0:
            continue

        r = float(np.corrcoef(xs, ys)[0, 1])
        strength = _bucket_strength(r)
        if strength is None:
            continue

        direction = "positive" if r > 0 else "negative"
        tendency = "tended to be higher" if direction == "positive" else "tended to be lower"

        findings.append(
            {
                "status": "found",
                "x": x_label,
                "y": y_label,
                "r": round(r, 2),
                "strength": strength,
                "direction": direction,
                "matched_days": len(paired),
                "evidence": (
                    f"Across {len(paired)} days with both logged, a {strength} "
                    f"{direction} association was found between {x_label.lower()} "
                    f"and {y_label.lower()} — on days with higher "
                    f"{x_label.lower()}, {y_label.lower()} {tendency}. "
                    "This is an association, not a proven cause."
                ),
            }
        )

    if not findings:
        return [
            {
                "status": "no_meaningful_pattern",
                "matched_days": len(paired),
                "evidence": (
                    f"{len(paired)} days have both habit and workout data logged, "
                    "but no meaningful association was detected between sleep, "
                    "water or steps and workout performance yet."
                ),
            }
        ]

    return findings
