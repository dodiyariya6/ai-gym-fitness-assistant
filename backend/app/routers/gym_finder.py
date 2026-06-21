# app/routers/gym_finder.py
"""
==================================================
AI Gym & Fitness Assistant

File: gym_finder.py

Purpose:
Defines API endpoints for locating nearby fitness
centers using OpenStreetMap services.

Functionality:
- Retrieves user location from their profile.
- Uses browser geolocation as the primary source.
- Uses profile city as a fallback location.
- Searches for nearby gyms within a selected radius.
- Returns filtered and sorted gym results.
- Uses OpenStreetMap services without AI or paid APIs.

API Base Route:
/gym-finder

Used By:
Gym Finder page
gym_service.py
User Profile module

==================================================
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.profile import Profile
from app.models.user import User

from app.services.auth_service import get_current_user

from app.services import gym_service

router = APIRouter(prefix="/gym-finder", tags=["Nearby Fitness Centers"])


@router.get("/profile-location")
async def get_profile_location(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns the user's city from their Profile and its geocoded coordinates
    via Nominatim (OpenStreetMap). No API key required.
    """
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()

    if not profile or not getattr(profile, "city", None):
        return {"city": None, "has_location": False, "lat": None, "lng": None}

    city: str = profile.city
    lat, lng = await gym_service.geocode_city(city)

    if lat is None:
        return {"city": city, "has_location": False, "lat": None, "lng": None}

    return {"city": city, "has_location": True, "lat": lat, "lng": lng}


@router.get("/gyms")
async def find_gyms(
    radius_km: float = Query(
        5.0, ge=1.0, le=10.0, description="Search radius in km (1-10)"
    ),
    lat: float = Query(..., description="Latitude — resolved client-side"),
    lng: float = Query(..., description="Longitude — resolved client-side"),
    current_user: User = Depends(get_current_user),
):
    """
    Search endpoint. The frontend resolves lat/lng before calling this
    (browser geolocation primary, profile city fallback), so this just
    queries Overpass for nearby fitness centres and returns the filtered,
    sorted, capped list. No AI personalisation.
    """
    try:
        gyms = await gym_service.find_gyms(lat=lat, lng=lng, radius_km=radius_km)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    return {"gyms": gyms, "total": len(gyms)}
