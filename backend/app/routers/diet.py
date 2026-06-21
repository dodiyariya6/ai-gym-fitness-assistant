# app/routers/diet.py
"""
==================================================
AI Gym & Fitness Assistant

File: diet.py

Purpose:
Defines API endpoints for diet analysis, calorie
calculations and AI-powered meal planning.

Functionality:
- Calculates BMI.
- Calculates BMR.
- Calculates TDEE.
- Calculates daily macronutrient targets.
- Generates AI meal plans.
- Generates grocery lists.
- Stores and retrieves meal plan history.
- Secures user-specific endpoints using JWT authentication.

API Base Route:
/diet

Used By:
Dietician page
diet_service.py
gemini_service.py
Meal Plan History
Reports system

==================================================
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.meal_plan import MealPlan
from app.schemas.diet import (
    DietInput,
    MealPlanRequest,
    GroceryRequest,
)
from app.services.diet_service import (
    calculate_bmi,
    calculate_bmr,
    calculate_tdee,
    calculate_macros,
)
from app.services.gemini_service import (
    generate_meal_plan,
    generate_grocery_list,
)
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/diet", tags=["Diet"])


@router.get("/")
def test_diet():
    return {"message": "Diet router working"}


# BMI is not gender-dependent — no change to this endpoint.
@router.post("/bmi")
def bmi(data: DietInput):
    bmi_value, category = calculate_bmi(data.weight, data.height)
    return {"bmi": bmi_value, "category": category}


@router.post("/bmr")
def bmr(data: DietInput):
    bmr_value = calculate_bmr(data.age, data.gender, data.weight, data.height)
    return {"bmr": bmr_value}


@router.post("/tdee")
def tdee(data: DietInput):
    bmr_value = calculate_bmr(data.age, data.gender, data.weight, data.height)
    tdee_value = calculate_tdee(bmr_value, data.activity_level)
    return {"tdee": tdee_value}


@router.post("/macros")
def macros(data: DietInput):
    bmr_value = calculate_bmr(data.age, data.gender, data.weight, data.height)
    tdee_value = calculate_tdee(bmr_value, data.activity_level)
    return calculate_macros(tdee_value)


@router.post("/meal-plan")
def meal_plan(
    data: MealPlanRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    plan = generate_meal_plan(
        age=data.age,
        gender=data.gender,  # now forwarded to Gemini
        weight=data.weight,
        height=data.height,
        goal=data.goal,
        diet_type=data.diet_type,
    )

    new_plan = MealPlan(
        user_id=current_user.id,
        goal=data.goal,
        diet_type=data.diet_type,
        meal_plan=plan,
    )
    db.add(new_plan)
    db.commit()
    db.refresh(new_plan)

    return {"id": new_plan.id, "meal_plan": plan}


@router.post("/grocery-list")
def grocery_list(data: GroceryRequest):
    grocery = generate_grocery_list(data.meal_plan)
    return {"grocery_list": grocery}


@router.get("/history")
def get_history(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    plans = db.query(MealPlan).filter(MealPlan.user_id == current_user.id).all()
    return plans


@router.get("/history/{plan_id}")
def get_plan_by_id(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    plan = (
        db.query(MealPlan)
        .filter(MealPlan.id == plan_id, MealPlan.user_id == current_user.id)
        .first()
    )
    if not plan:
        return {"message": "Plan not found"}
    return plan
