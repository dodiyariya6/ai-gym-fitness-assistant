# app/services/progressive_overload_service.py
"""
==================================================
IFA — Intelligent Fitness Assistant

File: progressive_overload_service.py

Purpose:
Deterministically detects progressive-overload
patterns (improving / plateau / declining / inactive)
per exercise from existing workout history. No AI,
no ML — pure arithmetic over already-stored reps,
sets and dates.

Functionality:
- Groups workout history by normalized exercise name.
- Classifies rep and volume trends using a first-half
  vs second-half average comparison.
- Flags recent inactivity for previously-regular exercises.
- Produces structured, human-readable evidence strings
  that Gemini can interpret but must not invent.

Responsibilities:
Exercise trend detection
Volume trend detection
Inactivity detection
Structured evidence generation

Used By:
ai_insight_service.py

==================================================
"""

from collections import defaultdict
from datetime import date

from app.models.workout import Workout

MIN_SESSIONS_FOR_TREND = 3
RECENT_SESSIONS_WINDOW = 6
INACTIVITY_DAYS_THRESHOLD = 14

# Relative change between the first-half and second-half average required
# to call something "improving"/"declining" rather than a "plateau" — keeps
# single noisy sessions from flipping the label.
_TREND_THRESHOLD = 0.08


def _normalize_name(name: str) -> str:
    return (name or "").strip().lower()


def _classify_sequence(values: list) -> str:
    """
    Classifies a numeric sequence (oldest → newest) by comparing the
    average of its first half against its second half.
    """
    n = len(values)
    if n < MIN_SESSIONS_FOR_TREND:
        return "insufficient_data"

    mid = n // 2
    first_half_avg = sum(values[:mid]) / mid
    second_half_avg = sum(values[mid:]) / (n - mid)

    if first_half_avg == 0:
        return "improving" if second_half_avg > 0 else "plateau"

    relative_change = (second_half_avg - first_half_avg) / first_half_avg

    if relative_change > _TREND_THRESHOLD:
        return "improving"
    if relative_change < -_TREND_THRESHOLD:
        return "declining"
    return "plateau"


def analyze_progressive_overload(db, user_id: int) -> list[dict]:
    """
    Returns one structured finding per exercise the user has logged,
    ordered by how many sessions exist (most-tracked exercise first).
    Returns [] for a user with no workout history — never fabricates data.
    """
    workouts = (
        db.query(Workout)
        .filter(Workout.user_id == user_id)
        .order_by(Workout.workout_date.asc(), Workout.id.asc())
        .all()
    )

    if not workouts:
        return []

    by_exercise: dict[str, list[Workout]] = defaultdict(list)
    for w in workouts:
        by_exercise[_normalize_name(w.exercise_name)].append(w)

    today = date.today()
    findings = []

    for sessions in by_exercise.values():
        recent = sessions[-RECENT_SESSIONS_WINDOW:]
        display_name = recent[-1].exercise_name
        reps_seq = [s.reps for s in recent]
        volume_seq = [s.sets * s.reps for s in recent]

        rep_status = _classify_sequence(reps_seq)
        volume_status = _classify_sequence(volume_seq)

        last_date = sessions[-1].workout_date
        days_since_last = (today - last_date).days
        inactive = (
            days_since_last >= INACTIVITY_DAYS_THRESHOLD
            and len(sessions) >= MIN_SESSIONS_FOR_TREND
        )

        if rep_status == "insufficient_data":
            evidence = (
                f"{display_name}: only {len(recent)} session(s) logged — not "
                "enough history yet to detect a trend."
            )
        else:
            evidence = (
                f"{display_name} reps across your last {len(recent)} sessions: "
                f"{', '.join(str(r) for r in reps_seq)}."
            )

        findings.append(
            {
                "exercise": display_name,
                "sessions_count": len(recent),
                "rep_sequence": reps_seq,
                "volume_sequence": volume_seq,
                "rep_status": rep_status,
                "volume_status": volume_status,
                "days_since_last_session": days_since_last,
                "inactive": inactive,
                "evidence": evidence,
            }
        )

    findings.sort(key=lambda f: f["sessions_count"], reverse=True)
    return findings
