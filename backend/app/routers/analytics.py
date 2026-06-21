# app/routers/analytics.py
"""
==================================================
AI Gym & Fitness Assistant

File: analytics.py

Purpose:
Defines API endpoints for retrieving user
analytics, trends and fitness insights.

Functionality:
- Retrieves dashboard analytics data.
- Retrieves habit trend data.
- Generates user performance insights.
- Provides data for charts and visualizations.
- Secures endpoints using JWT authentication.

API Base Route:
/analytics

Used By:
analytics_service.py
Dashboard
Reports system
Analytics charts

==================================================
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db

from app.schemas.analytics import AnalyticsResponse

from app.services.analytics_service import get_user_analytics, get_habit_trends

from app.services.auth_service import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/", response_model=AnalyticsResponse)
def analytics(db: Session = Depends(get_db), current_user=Depends(get_current_user)):

    return get_user_analytics(db, current_user.id)


@router.get("/trends")
def analytics_trends(
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):

    return get_habit_trends(db, current_user.id)
