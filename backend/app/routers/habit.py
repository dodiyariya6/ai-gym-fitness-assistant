# app/routers/habit.py
"""
==================================================
AI Gym & Fitness Assistant

File: habit.py

Purpose:
Defines API endpoints for managing daily habit
tracking and user wellness activities.

Functionality:
- Logs daily habit entries.
- Updates existing habit records.
- Retrieves habit history.
- Prevents duplicate habit entries.
- Secures endpoints using JWT authentication.

API Base Route:
/habit

Used By:
Habits page
habit_service.py
Dashboard
AI Wellness Score
AI Consistency Tracker
Reports system

==================================================
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.habit import HabitCreate, HabitResponse
from app.services.habit_service import create_habit, get_user_habits, update_habit
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/habit", tags=["Habit Tracker"])


@router.post("/log", response_model=HabitResponse)
def log_habit(
    habit: HabitCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return create_habit(db, current_user.id, habit)


@router.put("/log/{habit_id}", response_model=HabitResponse)
def edit_habit(
    habit_id: int,
    habit: HabitCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    updated = update_habit(db, current_user.id, habit_id, habit)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Habit entry not found."
        )
    return updated


@router.get("/history", response_model=list[HabitResponse])
def habit_history(
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    return get_user_habits(db, current_user.id)
