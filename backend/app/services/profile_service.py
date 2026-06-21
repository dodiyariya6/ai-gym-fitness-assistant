# app/services/profile_service.py
"""
==================================================
AI Gym & Fitness Assistant

File: profile_service.py

Purpose:
Provides profile management and AI-generated
health target calculations.

Functionality:
- Retrieves user profiles.
- Creates or updates profiles.
- Generates personalized health targets.
- Calculates water goals.
- Calculates sleep goals.
- Calculates step goals.
- Calculates calorie goals.

Responsibilities:
Profile management
Target generation
Biometric analysis
Personalization logic

Used By:
profile.py router
Profile page
Dietician page
Habits page
Dashboard
Reports system

==================================================
"""

from sqlalchemy.orm import Session
from app.models.profile import Profile
from app.services.diet_service import calculate_bmi, calculate_bmr, calculate_tdee


def get_profile(db: Session, user_id: int) -> Profile | None:
    return db.query(Profile).filter(Profile.user_id == user_id).first()


def upsert_profile(db: Session, user_id: int, data: dict) -> Profile:
    """
    Creates a new profile if one doesn't exist, otherwise updates it.
    Only updates fields that are provided (not None).
    """
    profile = get_profile(db, user_id)

    if not profile:
        profile = Profile(user_id=user_id)
        db.add(profile)

    for key, value in data.items():
        if value is not None:
            setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    return profile


_ACTIVITY_MAP = {
    "sedentary": "sedentary",
    "light": "light",
    "moderate": "moderate",
    "active": "active",
    "very active": "very_active",
    "very_active": "very_active",
}


def calculate_targets(
    age: int,
    gender: str,
    height: float,
    weight: float,
    fitness_goals: list[str],
    activity_level: str,
) -> dict:
    """
    Computes Water, Sleep, Step, and Calorie goals from biometric data.

    Logic:
      - Water : 35 ml/kg base + activity adjustment + goal adjustment
      - Sleep : Science-based 7-9 h adults; more recovery for very active / muscle goals
      - Steps : Primarily activity level; boosted for endurance/weight-loss goals
      - Calories: TDEE ± goal-specific adjustment (reuses existing diet_service logic)
    """
    goals_lower = [g.lower() for g in (fitness_goals or [])]
    act_key = _ACTIVITY_MAP.get((activity_level or "").lower().strip(), "sedentary")

    bmi, bmi_category = calculate_bmi(weight, height)
    bmr = calculate_bmr(age, gender, weight, height)
    tdee = calculate_tdee(bmr, act_key)
    water_base = (weight * 35) / 1000

    activity_water_bonus = {
        "sedentary": 0.0,
        "light": 0.2,
        "moderate": 0.4,
        "active": 0.6,
        "very_active": 0.8,
    }.get(act_key, 0.0)

    water_goal = water_base + activity_water_bonus
    if any(g in goals_lower for g in ["weight loss", "fat loss"]):
        water_goal += 0.3
    if any(
        g in goals_lower
        for g in ["athletic performance", "endurance training", "improve stamina"]
    ):
        water_goal += 0.2

    water_goal = round(min(max(water_goal, 1.5), 4.5), 1)

    if age < 18:
        sleep_base = 9.0
    elif age >= 65:
        sleep_base = 7.5
    else:
        sleep_base = 7.5  # same midpoint for all adults
    if act_key in ("active", "very_active"):
        sleep_base = min(sleep_base + 0.5, 9.0)
    if any(
        g in goals_lower
        for g in ["muscle gain", "athletic performance", "strength training"]
    ):
        sleep_base = min(sleep_base + 0.5, 9.0)

    sleep_goal = round(sleep_base, 1)
    step_base = {
        "sedentary": 6_000,
        "light": 8_000,
        "moderate": 10_000,
        "active": 12_000,
        "very_active": 15_000,
    }.get(act_key, 8_000)

    if any(
        g in goals_lower
        for g in ["athletic performance", "endurance training", "improve stamina"]
    ):
        step_base = int(step_base * 1.2)
    if any(g in goals_lower for g in ["weight loss", "fat loss"]):
        step_base = max(step_base, 10_000)
    if "general fitness" in goals_lower:
        step_base = max(step_base, 8_000)

    step_goal = min(step_base, 20_000)
    calorie_adjustment = 0
    if any(g in goals_lower for g in ["weight loss"]):
        calorie_adjustment = -400  # moderate deficit
    elif any(g in goals_lower for g in ["fat loss"]):
        calorie_adjustment = -300  # conservative deficit
    elif any(g in goals_lower for g in ["muscle gain"]):
        calorie_adjustment = +250  # lean bulk surplus
    elif any(g in goals_lower for g in ["athletic performance"]):
        calorie_adjustment = +200  # performance surplus
    elif any(g in goals_lower for g in ["body recomposition", "maintenance"]):
        calorie_adjustment = 0  # maintenance

    calorie_goal = max(int(tdee + calorie_adjustment), 1200)  # never below safe minimum
    reasoning = {
        "bmi": bmi,
        "bmi_category": bmi_category,
        "bmr": bmr,
        "tdee": tdee,
        "water_note": (
            f"Base {round(weight * 35 / 1000, 1)} L (35 ml/kg) + "
            f"{activity_water_bonus} L activity bonus"
        ),
        "sleep_note": (
            "7–9 h science-based adult range; +0.5 h for high activity / "
            "muscle/strength goals"
        ),
        "step_note": (
            f"Base {step_base:,} steps for '{activity_level}' level, "
            "adjusted for endurance/weight-loss goals"
        ),
        "calorie_note": (
            f"TDEE {tdee:.0f} kcal with {calorie_adjustment:+d} kcal "
            "adjustment for selected goals"
        ),
    }

    return {
        "water_goal": water_goal,
        "sleep_goal": sleep_goal,
        "step_goal": step_goal,
        "calorie_goal": calorie_goal,
        "bmi": bmi,
        "bmi_category": bmi_category,
        "bmr": bmr,
        "tdee": tdee,
        "reasoning": reasoning,
    }
