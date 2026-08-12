# tests/test_dietician_persistence.py
"""
==================================================
IFA — Intelligent Fitness Assistant

File: test_dietician_persistence.py

Purpose:
Covers Dietician meal-plan persistence, grocery-list
reuse, and history management added in the Final Product
Enhancement (Change 8/9). The Gemini calls themselves are
monkeypatched (not the whole endpoint) so these tests
exercise the real persistence/ownership logic without
depending on network access or the no_real_gemini fixture's
"unavailable" default.

Tests:
- Generating a meal plan persists a MealPlan row and
  returns the full row (id/user_id/goal/...).
- Generating a grocery list with plan_id persists it onto
  that MealPlan row; without plan_id, nothing is persisted
  (stateless path unchanged).
- Grocery-list plan_id is ownership-checked (404, not 403,
  for another user's plan — and their data is untouched).
- History lists only the caller's own plans.
- History-by-id is ownership-checked.
- Meal plan deletion is ownership-checked and idempotent-safe.

==================================================
"""

import pytest

from app.models.meal_plan import MealPlan


async def _fake_generate_meal_plan(**kwargs):
    return "Breakfast:\n- Oats\n\nTotal Calories: 2000"


async def _fake_generate_grocery_list(meal_plan):
    return "- Oats\n- Milk"


@pytest.fixture(autouse=True)
def stub_gemini_diet_calls(monkeypatch):
    """
    Applies to every test in this file: stub the two Gemini call sites diet.py
    imports directly, so meal-plan/grocery-list generation succeeds
    deterministically without a real Gemini call.
    """
    monkeypatch.setattr("app.routers.diet.generate_meal_plan", _fake_generate_meal_plan)
    monkeypatch.setattr("app.routers.diet.generate_grocery_list", _fake_generate_grocery_list)


def _meal_plan_payload():
    return {
        "age": 28,
        "gender": "male",
        "weight": 70,
        "height": 175,
        "goal": "Muscle Gain",
        "diet_type": "Vegetarian",
    }


# ── Creation persists ────────────────────────────────────────────────────


def test_meal_plan_creation_persists_row_and_returns_full_shape(client, make_user, auth_headers, db):
    user = make_user()
    response = client.post("/diet/meal-plan", json=_meal_plan_payload(), headers=auth_headers(user))

    assert response.status_code == 200
    body = response.json()
    assert body["id"]
    assert body["user_id"] == user.id
    assert body["goal"] == "Muscle Gain"
    assert body["diet_type"] == "Vegetarian"
    assert "Oats" in body["meal_plan"]
    assert body["grocery_list"] is None

    row = db.query(MealPlan).filter(MealPlan.id == body["id"]).first()
    assert row is not None
    assert row.user_id == user.id


# ── Grocery list persistence ─────────────────────────────────────────────


def test_grocery_list_with_plan_id_persists_onto_meal_plan(client, make_user, auth_headers, db):
    user = make_user()
    headers = auth_headers(user)
    created = client.post("/diet/meal-plan", json=_meal_plan_payload(), headers=headers)
    plan_id = created.json()["id"]

    response = client.post(
        "/diet/grocery-list",
        json={"meal_plan": created.json()["meal_plan"], "plan_id": plan_id},
        headers=headers,
    )
    assert response.status_code == 200
    assert "Oats" in response.json()["grocery_list"]

    row = db.query(MealPlan).filter(MealPlan.id == plan_id).first()
    assert row.grocery_list is not None
    assert "Milk" in row.grocery_list


def test_grocery_list_with_plan_id_cross_user_returns_404_and_leaves_data(
    client, make_user, auth_headers, db
):
    alice = make_user(username="alice_d", email="alice_d@example.com")
    bob = make_user(username="bob_d", email="bob_d@example.com")
    created = client.post("/diet/meal-plan", json=_meal_plan_payload(), headers=auth_headers(alice))
    plan_id = created.json()["id"]

    response = client.post(
        "/diet/grocery-list",
        json={"meal_plan": created.json()["meal_plan"], "plan_id": plan_id},
        headers=auth_headers(bob),
    )
    assert response.status_code == 404

    row = db.query(MealPlan).filter(MealPlan.id == plan_id).first()
    assert row.grocery_list is None


def test_grocery_list_without_plan_id_does_not_persist(client, make_user, auth_headers, db):
    user = make_user()
    headers = auth_headers(user)
    created = client.post("/diet/meal-plan", json=_meal_plan_payload(), headers=headers)
    plan_id = created.json()["id"]

    response = client.post(
        "/diet/grocery-list",
        json={"meal_plan": created.json()["meal_plan"]},
        headers=headers,
    )
    assert response.status_code == 200
    assert "Oats" in response.json()["grocery_list"]

    # Stateless path — the persisted plan is untouched.
    row = db.query(MealPlan).filter(MealPlan.id == plan_id).first()
    assert row.grocery_list is None


def test_grocery_list_requires_authentication(client):
    response = client.post("/diet/grocery-list", json={"meal_plan": "Breakfast: Oats"})
    assert response.status_code == 401


# ── History ───────────────────────────────────────────────────────────────


def test_diet_history_lists_only_own_plans(client, make_user, auth_headers):
    alice = make_user(username="alice_dh", email="alice_dh@example.com")
    bob = make_user(username="bob_dh", email="bob_dh@example.com")
    client.post("/diet/meal-plan", json=_meal_plan_payload(), headers=auth_headers(alice))
    client.post("/diet/meal-plan", json=_meal_plan_payload(), headers=auth_headers(bob))
    client.post("/diet/meal-plan", json=_meal_plan_payload(), headers=auth_headers(alice))

    alice_history = client.get("/diet/history", headers=auth_headers(alice))
    assert alice_history.status_code == 200
    assert len(alice_history.json()) == 2
    assert all(p["user_id"] == alice.id for p in alice_history.json())


def test_diet_history_by_id_cross_user_returns_404(client, make_user, auth_headers):
    alice = make_user(username="alice_di", email="alice_di@example.com")
    bob = make_user(username="bob_di", email="bob_di@example.com")
    created = client.post("/diet/meal-plan", json=_meal_plan_payload(), headers=auth_headers(alice))
    plan_id = created.json()["id"]

    response = client.get(f"/diet/history/{plan_id}", headers=auth_headers(bob))
    assert response.status_code == 404

    own = client.get(f"/diet/history/{plan_id}", headers=auth_headers(alice))
    assert own.status_code == 200


# ── Deletion ──────────────────────────────────────────────────────────────


def test_delete_meal_plan_success(client, make_user, auth_headers):
    user = make_user()
    headers = auth_headers(user)
    created = client.post("/diet/meal-plan", json=_meal_plan_payload(), headers=headers)
    plan_id = created.json()["id"]

    response = client.delete(f"/diet/history/{plan_id}", headers=headers)
    assert response.status_code == 204

    after = client.get(f"/diet/history/{plan_id}", headers=headers)
    assert after.status_code == 404


def test_delete_meal_plan_cross_user_returns_404(client, make_user, auth_headers):
    alice = make_user(username="alice_dd", email="alice_dd@example.com")
    bob = make_user(username="bob_dd", email="bob_dd@example.com")
    created = client.post("/diet/meal-plan", json=_meal_plan_payload(), headers=auth_headers(alice))
    plan_id = created.json()["id"]

    response = client.delete(f"/diet/history/{plan_id}", headers=auth_headers(bob))
    assert response.status_code == 404

    still_there = client.get(f"/diet/history/{plan_id}", headers=auth_headers(alice))
    assert still_there.status_code == 200


def test_delete_meal_plan_nonexistent_returns_404(client, make_user, auth_headers):
    user = make_user()
    response = client.delete("/diet/history/999999", headers=auth_headers(user))
    assert response.status_code == 404
