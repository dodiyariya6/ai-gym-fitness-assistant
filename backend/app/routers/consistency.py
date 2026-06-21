# app/routers/consistency.py
"""
==================================================
AI Gym & Fitness Assistant

File: consistency.py

Purpose:
Defines API endpoints for retrieving user
consistency and streak analytics.

Functionality:
- Retrieves user consistency statistics.
- Calculates workout and habit streaks.
- Returns weekly and monthly consistency data.
- Tracks successful activity days.
- Secures endpoints using JWT authentication.

API Base Route:
/consistency

Used By:
consistency_service.py
Dashboard
AI Consistency Tracker
Reports system

==================================================
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.consistency_service import get_consistency
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/consistency", tags=["Consistency"])


@router.get("/")
def consistency(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return get_consistency(db, current_user.id)
