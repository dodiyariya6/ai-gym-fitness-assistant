# app/services/diet_service.py
"""
==================================================
AI Gym & Fitness Assistant

File: diet_service.py

Purpose:
Provides diet-related calculations used for
nutrition analysis and meal planning.

Functionality:
- Calculates BMI.
- Calculates BMR.
- Calculates TDEE.
- Calculates daily macronutrients.
- Supports male, female and non-binary users.
- Generates personalized calorie targets.

Responsibilities:
BMI calculation
BMR calculation
TDEE calculation
Macronutrient calculation

Used By:
diet.py router
profile_service.py
Dietician page

==================================================
"""


def calculate_bmi(weight, height):
    height_m = height / 100
    bmi = weight / (height_m**2)
    if bmi < 18.5:
        category = "Underweight"
    elif bmi < 25:
        category = "Normal"
    elif bmi < 30:
        category = "Overweight"
    else:
        category = "Obese"
    return round(bmi, 2), category


# ── BMR (Mifflin-St Jeor) ─────────────────────────────────────────────────────
# Gender-aware. Non-binary uses the average of male and female coefficients
# as a clinically reasonable midpoint — this is documented in the prompt
# sent to Gemini so the AI plan also reflects it.
#
# Male:       BMR = 10W + 6.25H - 5A + 5
# Female:     BMR = 10W + 6.25H - 5A - 161
# Non-binary: BMR = 10W + 6.25H - 5A - 78   (midpoint: (5 + -161) / 2)


def calculate_bmr(age, gender, weight, height):
    base = 10 * weight + 6.25 * height - 5 * age
    g = (gender or "").lower().strip()

    if g == "male":
        bmr = base + 5
    elif g == "female":
        bmr = base - 161
    else:
        # non-binary / unspecified — midpoint of male and female offsets
        bmr = base - 78

    return round(bmr, 2)


# ── TDEE ──────────────────────────────────────────────────────────────────────


def calculate_tdee(bmr, activity_level):
    activity_map = {
        "sedentary": 1.2,
        "light": 1.375,
        "moderate": 1.55,
        "active": 1.725,
        "very_active": 1.9,
    }
    multiplier = activity_map.get(
        (activity_level or "").lower().strip(),
        1.2,
    )
    return round(bmr * multiplier, 2)


# ── Macros ────────────────────────────────────────────────────────────────────


def calculate_macros(tdee):
    protein_calories = tdee * 0.30
    carbs_calories = tdee * 0.40
    fats_calories = tdee * 0.30

    return {
        "protein": round(protein_calories / 4, 2),
        "carbs": round(carbs_calories / 4, 2),
        "fats": round(fats_calories / 9, 2),
    }
