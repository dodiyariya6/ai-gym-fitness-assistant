# tests/test_analytics_intelligence.py
"""
==================================================
IFA — Intelligent Fitness Assistant

File: test_analytics_intelligence.py

Purpose:
Covers the deterministic Layer 1 intelligence services
(context, progressive overload, habit/workout
correlation) plus the structured /analytics/insights
contract.

Tests:
1. New user with no history gets explicit no-data
   framing — never fabricated workout/habit history.
2. Progressive overload detection correctly identifies
   an improving rep progression.
3. Habit/workout correlation detects a meaningful
   association and uses non-causal wording.
4. GET /analytics/insights returns the expected
   structured schema.

==================================================
"""

from datetime import date, timedelta

from app.models.habit import Habit
from app.models.workout import Workout
from app.services.context_service import build_user_context
from app.services.progressive_overload_service import analyze_progressive_overload
from app.services.correlation_service import analyze_habit_workout_correlation


# ── Test 1 ──────────────────────────────────────────────────────────────────


def test_new_user_gets_explicit_no_data_framing_not_fabricated_history(db, make_user):
    user = make_user()

    context = build_user_context(db, user.id)

    assert context.has_workout_history is False
    assert context.has_habit_history is False

    prompt_block = context.to_prompt_context()
    assert "Workout history: none logged yet." in prompt_block
    assert "Habit history: none logged yet." in prompt_block

    # Layer 1 findings must not invent history either — an empty list /
    # explicit "insufficient_data" status, never a fabricated trend.
    assert analyze_progressive_overload(db, user.id) == []

    correlation_findings = analyze_habit_workout_correlation(db, user.id)
    assert len(correlation_findings) == 1
    assert correlation_findings[0]["status"] == "insufficient_data"


# ── Test 2 ──────────────────────────────────────────────────────────────────


def test_progressive_overload_detects_improving_progression(db, make_user):
    user = make_user()

    today = date.today()
    # 6 sessions, oldest → newest: reps clearly increasing in the second half.
    reps_sequence = [8, 8, 9, 14, 15, 16]
    for i, reps in enumerate(reps_sequence):
        db.add(
            Workout(
                user_id=user.id,
                exercise_name="Push Up",
                sets=3,
                reps=reps,
                calories_burned=50,
                form_score=80,
                workout_date=today - timedelta(days=(len(reps_sequence) - i)),
            )
        )
    db.commit()

    findings = analyze_progressive_overload(db, user.id)

    assert len(findings) == 1
    finding = findings[0]
    assert finding["exercise"] == "Push Up"
    assert finding["rep_status"] == "improving"
    assert finding["rep_sequence"] == reps_sequence


# ── Test 3 ──────────────────────────────────────────────────────────────────


def test_correlation_detects_association_with_non_causal_wording(db, make_user):
    user = make_user()

    today = date.today()
    # 6 paired days with sleep and form score rising together — a perfect
    # positive correlation (r = 1.0), comfortably past the MIN_PAIRED_DAYS
    # gate and the "weak" strength threshold.
    sleep_hours = [5.0, 5.5, 6.0, 6.5, 7.0, 7.5]
    form_scores = [60, 65, 70, 75, 80, 85]
    for i, (sleep, form) in enumerate(zip(sleep_hours, form_scores)):
        day = today - timedelta(days=(len(sleep_hours) - i))
        db.add(Habit(user_id=user.id, water_intake=2.0, sleep_hours=sleep, steps=5000, date=day))
        db.add(
            Workout(
                user_id=user.id,
                exercise_name="Squat",
                sets=3,
                reps=10,
                calories_burned=100,
                form_score=form,
                workout_date=day,
            )
        )
    db.commit()

    findings = analyze_habit_workout_correlation(db, user.id)

    sleep_form_findings = [f for f in findings if f.get("status") == "found" and f["x"] == "Sleep"]
    assert len(sleep_form_findings) == 1

    finding = sleep_form_findings[0]
    assert finding["direction"] == "positive"
    assert finding["strength"] == "strong"

    # Non-causal language: association/tendency wording only, never "causes".
    evidence_lower = finding["evidence"].lower()
    assert "causes" not in evidence_lower
    assert "associated with" in evidence_lower or "tended to" in evidence_lower


# ── Test 4 ──────────────────────────────────────────────────────────────────


def test_analytics_insights_returns_expected_structured_schema(client, make_user, auth_headers):
    user = make_user()

    response = client.get("/analytics/insights", headers=auth_headers(user))

    assert response.status_code == 200
    body = response.json()

    assert set(["insights", "generated_at", "source"]).issubset(body.keys())
    assert body["source"] in {"ai", "fallback"}
    assert isinstance(body["insights"], list)
    assert len(body["insights"]) > 0

    required_fields = {"category", "priority", "title", "evidence", "recommendation"}
    allowed_categories = {
        "wellness",
        "recovery",
        "progressive_overload",
        "habit_correlation",
        "consistency",
        "nutrition",
        "general",
    }
    for insight in body["insights"]:
        assert required_fields.issubset(insight.keys())
        assert insight["category"] in allowed_categories
        assert insight["priority"] in {"high", "medium", "low"}
        assert isinstance(insight["title"], str) and insight["title"]
        assert isinstance(insight["evidence"], str) and insight["evidence"]
        assert isinstance(insight["recommendation"], str) and insight["recommendation"]
