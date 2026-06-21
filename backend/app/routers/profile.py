# app/routers/profile.py
"""
==================================================
AI Gym & Fitness Assistant

File: profile.py

Purpose:
Defines API endpoints for managing user profiles
and AI-generated health targets.

Functionality:
- Retrieves user profile information.
- Creates and updates profile data.
- Generates personalized health targets.
- Stores AI-generated target values.
- Retrieves previously saved targets.
- Secures endpoints using JWT authentication.

API Base Route:
/profile

Used By:
Profile page
Dietician page
Habits page
Dashboard
Reports system
AI Wellness Score
Gym Finder

==================================================
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.auth_service import get_current_user
from app.services.profile_service import get_profile, upsert_profile, calculate_targets
from app.schemas.profile import ProfileCreate, ProfileUpdate

router = APIRouter(prefix="/profile", tags=["Profile"])


def _serialize(profile, email: str) -> dict:
    """Merge Profile ORM object with email from the User table."""
    return {
        "id": profile.id,
        "user_id": profile.user_id,
        "email": email,
        "name": profile.name,
        "age": profile.age,
        "gender": profile.gender,
        "height": profile.height,
        "weight": profile.weight,
        "city": profile.city,
        "state": profile.state,
        "country": profile.country,
        "fitness_goals": profile.fitness_goals or [],
        "activity_level": profile.activity_level,
        "water_goal": profile.water_goal,
        "sleep_goal": profile.sleep_goal,
        "step_goal": profile.step_goal,
        "calorie_goal": profile.calorie_goal,
    }


@router.get("/me")
def get_my_profile(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    profile = get_profile(db, current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return _serialize(profile, current_user.email)


@router.post("/")
def create_or_update_profile(
    data: ProfileCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    payload = data.model_dump(exclude_none=True)
    profile = upsert_profile(db, current_user.id, payload)
    return _serialize(profile, current_user.email)


@router.put("/me")
def update_my_profile(
    data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    payload = data.model_dump(exclude_none=True)
    profile = upsert_profile(db, current_user.id, payload)
    return _serialize(profile, current_user.email)


@router.get("/targets")
def get_ai_targets(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    profile = get_profile(db, current_user.id)

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Profile not found. Complete your profile first.",
        )

    missing = [
        f for f in ("age", "gender", "height", "weight") if not getattr(profile, f)
    ]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing fields to generate targets: {', '.join(missing)}",
        )

    targets = calculate_targets(
        age=profile.age,
        gender=profile.gender,
        height=profile.height,
        weight=profile.weight,
        fitness_goals=profile.fitness_goals or [],
        activity_level=profile.activity_level or "sedentary",
    )

    upsert_profile(
        db,
        current_user.id,
        {
            "water_goal": targets["water_goal"],
            "sleep_goal": targets["sleep_goal"],
            "step_goal": targets["step_goal"],
            "calorie_goal": targets["calorie_goal"],
        },
    )

    return targets


@router.get("/targets/stored")
def get_stored_targets(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Returns the last saved targets from the profile row.
    Used by Habits module to avoid recalculating every time.
    """
    profile = get_profile(db, current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    return {
        "water_goal": profile.water_goal,
        "sleep_goal": profile.sleep_goal,
        "step_goal": profile.step_goal,
        "calorie_goal": profile.calorie_goal,
    }
