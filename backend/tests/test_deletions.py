# tests/test_deletions.py
"""
==================================================
IFA — Intelligent Fitness Assistant

File: test_deletions.py

Purpose:
Covers the habit/workout log deletion endpoints added
in the Final Product Enhancement (Change 3/4/5), plus a
verification test that the AI insights cache correctly
reflects a deletion rather than serving stale data.

Tests cover, for both habit and workout deletion:
- Successful delete removes the row and returns 204.
- Deleting a nonexistent id returns 404.
- Cross-user deletion returns 404 (never 403) and leaves
  the owner's record untouched.
- Unauthenticated deletion returns 401.
- Deleting the same record twice returns 404 the second
  time (idempotent-safe, never 500).

Plus one insights-cache consistency test.

==================================================
"""

from datetime import date

from app.models.habit import Habit
from app.models.workout import Workout
from app.services.ai_insight_service import _insight_cache, _context_hash
from app.services.analytics_service import get_user_analytics
from app.services.context_service import build_user_context
from app.services.progressive_overload_service import analyze_progressive_overload
from app.services.correlation_service import analyze_habit_workout_correlation


def _make_habit(db, user_id, day=None):
    habit = Habit(
        user_id=user_id,
        water_intake=2.0,
        sleep_hours=7.0,
        steps=5000,
        workout_done=True,
        date=day or date.today(),
    )
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return habit


def _make_workout(db, user_id, day=None):
    workout = Workout(
        user_id=user_id,
        exercise_name="Deadlift",
        sets=3,
        reps=8,
        calories_burned=120,
        form_score=75,
        workout_date=day or date.today(),
    )
    db.add(workout)
    db.commit()
    db.refresh(workout)
    return workout


# ── Habit deletion ────────────────────────────────────────────────────────


def test_delete_habit_success_returns_204_and_removes_row(client, make_user, auth_headers, db):
    user = make_user()
    habit = _make_habit(db, user.id)

    response = client.delete(f"/habit/log/{habit.id}", headers=auth_headers(user))
    assert response.status_code == 204

    history = client.get("/habit/history", headers=auth_headers(user))
    assert history.json() == []


def test_delete_habit_nonexistent_returns_404(client, make_user, auth_headers):
    user = make_user()
    response = client.delete("/habit/log/999999", headers=auth_headers(user))
    assert response.status_code == 404


def test_delete_habit_cross_user_returns_404_and_leaves_record(client, make_user, auth_headers, db):
    alice = make_user(username="alice_h", email="alice_h@example.com")
    bob = make_user(username="bob_h", email="bob_h@example.com")
    habit = _make_habit(db, alice.id)

    response = client.delete(f"/habit/log/{habit.id}", headers=auth_headers(bob))
    assert response.status_code == 404

    still_there = client.get("/habit/history", headers=auth_headers(alice))
    assert len(still_there.json()) == 1


def test_delete_habit_unauthenticated_returns_401(client, make_user, db):
    user = make_user()
    habit = _make_habit(db, user.id)
    response = client.delete(f"/habit/log/{habit.id}")
    assert response.status_code == 401


def test_delete_habit_twice_returns_404_second_time(client, make_user, auth_headers, db):
    user = make_user()
    habit = _make_habit(db, user.id)
    headers = auth_headers(user)

    first = client.delete(f"/habit/log/{habit.id}", headers=headers)
    assert first.status_code == 204

    second = client.delete(f"/habit/log/{habit.id}", headers=headers)
    assert second.status_code == 404


# ── Workout deletion ──────────────────────────────────────────────────────


def test_delete_workout_success_returns_204_and_removes_row(client, make_user, auth_headers, db):
    user = make_user()
    workout = _make_workout(db, user.id)

    response = client.delete(f"/workout/{workout.id}", headers=auth_headers(user))
    assert response.status_code == 204

    history = client.get("/workout/history", headers=auth_headers(user))
    assert history.json() == []


def test_delete_workout_nonexistent_returns_404(client, make_user, auth_headers):
    user = make_user()
    response = client.delete("/workout/999999", headers=auth_headers(user))
    assert response.status_code == 404


def test_delete_workout_cross_user_returns_404_and_leaves_record(client, make_user, auth_headers, db):
    alice = make_user(username="alice_w", email="alice_w@example.com")
    bob = make_user(username="bob_w", email="bob_w@example.com")
    workout = _make_workout(db, alice.id)

    response = client.delete(f"/workout/{workout.id}", headers=auth_headers(bob))
    assert response.status_code == 404

    still_there = client.get("/workout/history", headers=auth_headers(alice))
    assert len(still_there.json()) == 1


def test_delete_workout_unauthenticated_returns_401(client, make_user, db):
    user = make_user()
    workout = _make_workout(db, user.id)
    response = client.delete(f"/workout/{workout.id}")
    assert response.status_code == 401


def test_delete_workout_twice_returns_404_second_time(client, make_user, auth_headers, db):
    user = make_user()
    workout = _make_workout(db, user.id)
    headers = auth_headers(user)

    first = client.delete(f"/workout/{workout.id}", headers=headers)
    assert first.status_code == 204

    second = client.delete(f"/workout/{workout.id}", headers=headers)
    assert second.status_code == 404


# ── Webcam workouts use the identical deletion path (Change 5) ─────────────


def test_delete_webcam_generated_workout_uses_same_endpoint(client, make_user, auth_headers, db):
    user = make_user()
    # Webcam.jsx saves through POST /workout/save with notes="AI Webcam Session"
    # — same Workout row/table as manual logging, so the same DELETE endpoint
    # must remove it.
    webcam_workout = Workout(
        user_id=user.id,
        exercise_name="Squat",
        sets=1,
        reps=12,
        calories_burned=90,
        form_score=88,
        notes="AI Webcam Session",
        workout_date=date.today(),
    )
    db.add(webcam_workout)
    db.commit()
    db.refresh(webcam_workout)

    response = client.delete(f"/workout/{webcam_workout.id}", headers=auth_headers(user))
    assert response.status_code == 204

    history = client.get("/workout/history", headers=auth_headers(user))
    assert history.json() == []


# ── Insights cache reflects deletions (no stale data) ───────────────────────


def test_insights_cache_reflects_workout_deletion(client, make_user, auth_headers, db):
    """
    Verifies the existing content-hash cache in ai_insight_service.py
    correctly changes key (and therefore regenerates, not serves stale
    data) when underlying data changes via deletion — no production code
    change should be required for this to pass; it locks down existing
    behavior that Change 3/4 deletions rely on.
    """
    user = make_user()
    headers = auth_headers(user)
    workout = _make_workout(db, user.id)

    # Populate the cache — this is the exact call GET /analytics/insights
    # makes internally.
    first_response = client.get("/analytics/insights", headers=headers)
    assert first_response.status_code == 200
    assert user.id in _insight_cache
    hash_before = _insight_cache[user.id]["hash"]

    db.delete(workout)
    db.commit()

    second_response = client.get("/analytics/insights", headers=headers)
    assert second_response.status_code == 200
    hash_after = _insight_cache[user.id]["hash"]

    # The cache key changed — proves the deletion was NOT served from the
    # stale pre-deletion cache entry.
    assert hash_before != hash_after

    # Cross-check with a hash computed directly from post-deletion data.
    context_after = build_user_context(db, user.id)
    overload_after = analyze_progressive_overload(db, user.id)
    correlation_after = analyze_habit_workout_correlation(db, user.id)
    breakdown_after = get_user_analytics(db, user.id).get("wellness_breakdown", [])
    expected_hash_after = _context_hash(
        breakdown_after, overload_after, correlation_after, context_after
    )
    assert hash_after == expected_hash_after
