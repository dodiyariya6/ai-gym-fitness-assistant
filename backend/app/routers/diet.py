# app/routers/diet.py
"""
==================================================
IFA — Intelligent Fitness Assistant

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

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.meal_plan import MealPlan
from app.schemas.diet import (
    DietInput,
    MealPlanRequest,
    GroceryRequest,
    MealPlanResponse,
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
    AIUnavailableError,
)
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/diet", tags=["Diet"])


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


@router.post("/meal-plan", response_model=MealPlanResponse)
async def meal_plan(
    data: MealPlanRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        plan = await generate_meal_plan(
            age=data.age,
            gender=data.gender,
            weight=data.weight,
            height=data.height,
            goal=data.goal,
            diet_type=data.diet_type,
            activity_level=data.activity_level,
            target_calories=data.target_calories,
        )
    except AIUnavailableError:
        raise HTTPException(
            status_code=503,
            detail="Meal plan generation is temporarily unavailable. Please try again shortly.",
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

    # Return the full persisted row (not just {id, meal_plan}) so the
    # frontend can treat a freshly-generated plan identically to one loaded
    # from history — no second round trip needed to start tracking activePlanId.
    return new_plan


@router.post("/grocery-list")
async def grocery_list(
    data: GroceryRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        grocery = await generate_grocery_list(data.meal_plan)
    except AIUnavailableError:
        raise HTTPException(
            status_code=503,
            detail="Grocery list generation is temporarily unavailable. Please try again shortly.",
        )

    # When the caller identifies which persisted plan this grocery list
    # belongs to, save it onto that row so it survives navigation instead of
    # being regenerated (and re-billed to Gemini) every time the plan is
    # reopened. Ownership-checked — 404 (not 403) for a plan_id that doesn't
    # exist or belongs to another user, same non-disclosure pattern used
    # throughout this codebase (see chat_service.get_or_create_session).
    if data.plan_id is not None:
        plan = (
            db.query(MealPlan)
            .filter(MealPlan.id == data.plan_id, MealPlan.user_id == current_user.id)
            .first()
        )
        if not plan:
            raise HTTPException(status_code=404, detail="Meal plan not found")
        plan.grocery_list = grocery
        db.commit()

    return {"grocery_list": grocery}


@router.get("/history", response_model=list[MealPlanResponse])
def get_history(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    plans = (
        db.query(MealPlan)
        .filter(MealPlan.user_id == current_user.id)
        .order_by(MealPlan.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return plans


@router.get("/history/{plan_id}", response_model=MealPlanResponse)
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
        raise HTTPException(status_code=404, detail="Meal plan not found")
    return plan


@router.delete("/history/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal_plan(
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
        raise HTTPException(status_code=404, detail="Meal plan not found")

    db.delete(plan)
    db.commit()
