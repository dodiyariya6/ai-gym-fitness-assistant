# tests/test_progressive_overload_endpoint.py
"""
==================================================
IFA — Intelligent Fitness Assistant

File: test_progressive_overload_endpoint.py

Purpose:
Covers GET /analytics/progressive-overload — the
deterministic, uncapped, no-AI-call endpoint added for
the Workout page's "coach notes" panel (Change 6).

Tests:
- Returns a finding per distinct exercise the user has
  logged, including exercises the capped
  /analytics/insights list would not necessarily surface.
- Requires authentication.

==================================================
"""

from datetime import date, timedelta

from app.models.workout import Workout


def test_progressive_overload_endpoint_returns_all_exercises(client, make_user, auth_headers, db):
    user = make_user()
    today = date.today()

    # Two distinct exercises, each with enough sessions to produce a real
    # trend (not "insufficient_data").
    for i, reps in enumerate([8, 8, 9, 14, 15, 16]):
        db.add(
            Workout(
                user_id=user.id,
                exercise_name="Bench Press",
                sets=3,
                reps=reps,
                calories_burned=80,
                form_score=75,
                workout_date=today - timedelta(days=(6 - i)),
            )
        )
    for i, reps in enumerate([12, 12, 11, 10, 9, 8]):
        db.add(
            Workout(
                user_id=user.id,
                exercise_name="Lat Pulldown",
                sets=3,
                reps=reps,
                calories_burned=70,
                form_score=70,
                workout_date=today - timedelta(days=(6 - i)),
            )
        )
    db.commit()

    response = client.get("/analytics/progressive-overload", headers=auth_headers(user))
    assert response.status_code == 200
    findings = response.json()

    exercises = {f["exercise"] for f in findings}
    assert exercises == {"Bench Press", "Lat Pulldown"}

    bench = next(f for f in findings if f["exercise"] == "Bench Press")
    assert bench["rep_status"] == "improving"
    lat = next(f for f in findings if f["exercise"] == "Lat Pulldown")
    assert lat["rep_status"] == "declining"


def test_progressive_overload_endpoint_requires_auth(client):
    response = client.get("/analytics/progressive-overload")
    assert response.status_code == 401


def test_progressive_overload_endpoint_empty_for_new_user(client, make_user, auth_headers):
    user = make_user()
    response = client.get("/analytics/progressive-overload", headers=auth_headers(user))
    assert response.status_code == 200
    assert response.json() == []
