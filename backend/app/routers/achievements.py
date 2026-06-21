# app/routers/achievements.py
"""
==================================================
AI Gym & Fitness Assistant

File: achievements.py

Purpose:
Defines API endpoints for retrieving and updating
user achievement progress.

Functionality:
- Provides achievement-related API routes.
- Retrieves user achievement data.
- Evaluates achievement unlock conditions.
- Returns updated achievement progress.
- Secures endpoints using JWT authentication.

API Base Route:
/achievements

Used By:
achievement_service.py
Dashboard
Achievement System

==================================================
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.achievement_service import evaluate_achievements
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/achievements", tags=["Achievements"])


@router.get("/")
def achievements(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return evaluate_achievements(db, current_user.id)
