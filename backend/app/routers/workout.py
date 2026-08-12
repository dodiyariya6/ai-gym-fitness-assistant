# app/routers/workout.py
"""
==================================================
IFA — Intelligent Fitness Assistant

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

from fastapi import APIRouter, Depends, HTTPException, Query, status

from sqlalchemy.orm import Session

from app.database import get_db

from app.schemas.workout import WorkoutCreate, WorkoutResponse

from app.services.workout_service import (
    create_workout,
    get_user_workouts,
    delete_workout,
)

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
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    return get_user_workouts(db, current_user.id, limit=limit, offset=offset)


@router.delete("/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_workout(
    workout_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # 404 (never 403) whether the workout doesn't exist or belongs to
    # another user. Covers manual AND webcam-generated workouts — both are
    # plain Workout rows saved through the same create_workout() pathway.
    deleted = delete_workout(db, current_user.id, workout_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Workout not found."
        )
