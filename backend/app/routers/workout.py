# app/routers/workout.py
"""
==================================================
AI Gym & Fitness Assistant

File: workout.py

Purpose:
Defines API endpoints for logging and retrieving
user workout sessions.

Functionality:
- Saves workout records.
- Retrieves workout history.
- Associates workouts with authenticated users.
- Stores workout performance data.
- Secures endpoints using JWT authentication.

API Base Route:
/workout

Used By:
Workout page
Dashboard
Reports system
AI Wellness Score
AI Consistency Tracker

==================================================
"""

from fastapi import APIRouter, Depends

from sqlalchemy.orm import Session

from app.database import get_db

from app.schemas.workout import WorkoutCreate, WorkoutResponse

from app.services.workout_service import create_workout, get_user_workouts

from app.services.auth_service import get_current_user

router = APIRouter(prefix="/workout", tags=["Workout"])


@router.post("/save", response_model=WorkoutResponse)
def save_workout(
    workout: WorkoutCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    return create_workout(db, current_user.id, workout)


@router.get("/history", response_model=list[WorkoutResponse])
def workout_history(
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):

    return get_user_workouts(db, current_user.id)
