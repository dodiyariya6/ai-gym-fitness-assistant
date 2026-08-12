# app/routers/analytics.py
"""
==================================================
IFA — Intelligent Fitness Assistant

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

from app.schemas.analytics import AnalyticsResponse, OverloadFinding
from app.schemas.insight import InsightsResponse

from app.services.analytics_service import get_user_analytics, get_habit_trends
from app.services.ai_insight_service import generate_insights
from app.services.progressive_overload_service import analyze_progressive_overload

from app.services.auth_service import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("", response_model=AnalyticsResponse)
def analytics(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # Registered at "" (not "/") so the route is exactly "/analytics" with no
    # trailing slash — matching analyticsService.js's actual call exactly.
    # A trailing-slash mismatch here previously made Starlette 307-redirect
    # "/analytics" -> "/analytics/"; browsers refuse to follow a redirect on
    # a credentialed cross-origin XHR and report it as a CORS/preflight
    # failure instead of surfacing the redirect, even though the redirect
    # response itself carried correct CORS headers.
    return get_user_analytics(db, current_user.id)


@router.get("/trends")
def analytics_trends(
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):

    return get_habit_trends(db, current_user.id)


@router.get("/insights", response_model=InsightsResponse)
async def analytics_insights(
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    """
    Grounded, structured AI insights (P2.2/P2.3). Deterministic findings are
    computed first (analytics/progressive-overload/correlation services);
    Gemini only interprets them. Falls back to deterministic-only insights
    if Gemini is unavailable — never fails the request.
    """
    return await generate_insights(db, current_user.id)


@router.get("/progressive-overload", response_model=list[OverloadFinding])
def analytics_progressive_overload(
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    """
    Deterministic, per-exercise overload trend — no AI call, no caching
    needed (cheap query, same one already run internally on every
    /analytics/insights call). Returns every exercise the user has logged,
    uncapped, so the Workout page can show trends the capped insights list
    might otherwise omit.
    """
    return analyze_progressive_overload(db, current_user.id)
