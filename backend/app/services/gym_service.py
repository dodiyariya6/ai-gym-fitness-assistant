# app/services/gym_service.py
"""
==================================================
AI Gym & Fitness Assistant

File: gym_service.py

Purpose:
Provides nearby gym search functionality
using OpenStreetMap services.

Functionality:
- Geocodes cities into coordinates.
- Searches nearby gyms.
- Calculates gym distances.
- Filters low-quality results.
- Removes duplicate results.
- Sorts gyms by relevance and distance.

Responsibilities:
OpenStreetMap integration
Nominatim geocoding
Overpass search
Distance calculation
Gym filtering

Used By:
gym_finder.py router
Gym Finder page

==================================================
"""

import asyncio
import math
from typing import Optional, Tuple, List

import httpx

_NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
_OVERPASS_URL = "https://overpass-api.de/api/interpreter"

_HEADERS = {"User-Agent": "AIGymFitnessAssistant/1.0 (fitness-assistant-project)"}

# ── Quality filter constants ──────────────────────────────────────────────────

_INVALID_NAMES: set[str] = {
    "",
    "unnamed gym",
    "celebrity",
    "gym",
    "fitness",
    "fitness centre",
    "fitness center",
    "health club",
    "sports centre",
    "sports center",
    "unknown",
    "no name",
}

_MIN_NAME_LENGTH = 4

_PREFERRED_CHAINS: list[str] = [
    "cult.fit",
    "cult fit",
    "golds gym",
    "gold's gym",
    "anytime fitness",
    "fitness one",
    "bodyline",
    "snap fitness",
    "la fitness",
    "planet fitness",
    "crossfit",
    "f45",
]


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _is_preferred_chain(name: str) -> bool:
    lower = name.lower()
    return any(chain in lower for chain in _PREFERRED_CHAINS)


def _sort_key(gym: dict) -> tuple:
    return (0 if _is_preferred_chain(gym["name"]) else 1, gym["distance_km"])


async def geocode_city(city: str) -> Tuple[Optional[float], Optional[float]]:
    async with httpx.AsyncClient(timeout=10, headers=_HEADERS) as client:
        resp = await client.get(
            _NOMINATIM_URL,
            params={"q": city, "format": "json", "limit": 1},
        )
    data = resp.json()
    if not data:
        return None, None
    return float(data[0]["lat"]), float(data[0]["lon"])


def _build_query(lat: float, lng: float, radius_m: int) -> str:
    """
    Single compact Overpass union covering the five most reliable gym tags.
    Name-regex branches are intentionally excluded — they are expensive,
    trigger rate-limiting (HTTP 429), and return too much noise.

    Tags used:
      leisure=fitness_centre  — primary OSM tag for commercial gyms
      amenity=gym             — alternative used by many Indian mappers
      sport=fitness           — secondary tag, often combined with leisure
      leisure=health_club     — used for membership-based fitness clubs
      leisure=sports_centre   — larger facilities that contain gyms
    """
    r = radius_m
    c = f"{lat},{lng}"
    return f"""
[out:json][timeout:25];
(
  node["leisure"="fitness_centre"](around:{r},{c});
  way["leisure"="fitness_centre"](around:{r},{c});
  node["amenity"="gym"](around:{r},{c});
  way["amenity"="gym"](around:{r},{c});
  node["sport"="fitness"](around:{r},{c});
  way["sport"="fitness"](around:{r},{c});
  node["leisure"="health_club"](around:{r},{c});
  way["leisure"="health_club"](around:{r},{c});
  node["leisure"="sports_centre"](around:{r},{c});
  way["leisure"="sports_centre"](around:{r},{c});
);
out center tags;
"""


async def _overpass_gyms(lat: float, lng: float, radius_m: int) -> List[dict]:
    """
    POST the Overpass query with one automatic retry on HTTP 429.
    Waits 4 seconds before retrying to respect the rate-limit window.
    Raises RuntimeError on persistent failure so the router returns a 502.
    """
    query = _build_query(lat, lng, radius_m)

    async with httpx.AsyncClient(timeout=40, headers=_HEADERS) as client:
        resp = await client.post(_OVERPASS_URL, data={"data": query})

        if resp.status_code == 429:
            # Rate-limited — wait and retry once
            await asyncio.sleep(4)
            resp = await client.post(_OVERPASS_URL, data={"data": query})

        if resp.status_code != 200:
            raise RuntimeError(f"Overpass API error: HTTP {resp.status_code}")

    return resp.json().get("elements", [])


def _parse_overpass_element(
    el: dict, user_lat: float, user_lng: float
) -> Optional[dict]:
    tags = el.get("tags", {})

    if el["type"] == "way":
        center = el.get("center", {})
        gym_lat = center.get("lat")
        gym_lng = center.get("lon")
    else:
        gym_lat = el.get("lat")
        gym_lng = el.get("lon")

    if gym_lat is None or gym_lng is None:
        return None

    name = (tags.get("name") or "").strip()

    address_parts = []
    for key in ("addr:housenumber", "addr:street", "addr:suburb", "addr:city"):
        val = tags.get(key)
        if val:
            address_parts.append(val)
    address = tags.get("addr:full") or (
        ", ".join(address_parts) if address_parts else None
    )

    phone = tags.get("phone") or tags.get("contact:phone")
    website = tags.get("website") or tags.get("contact:website") or tags.get("url")

    distance_km = round(_haversine_km(user_lat, user_lng, gym_lat, gym_lng), 2)

    return {
        "osm_id": f"{el['type']}/{el['id']}",
        "name": name,
        "lat": gym_lat,
        "lng": gym_lng,
        "distance_km": distance_km,
        "address": address,
        "phone": phone,
        "website": website,
    }


def _is_quality_result(gym: dict) -> bool:
    """
    Keeps only results with a real name.
    Address requirement is relaxed for preferred chains (they may simply not
    have addr:* tags in OSM yet) but enforced for everything else to avoid
    nameless/addressless noise nodes.
    """
    name = gym["name"].strip()

    if len(name) < _MIN_NAME_LENGTH:
        return False
    if name.lower() in _INVALID_NAMES:
        return False

    if _is_preferred_chain(name):
        return True  # trusted chain — show even without address

    if not gym.get("address"):
        return False  # generic gym without address — discard

    return True


async def find_gyms(lat: float, lng: float, radius_km: float) -> List[dict]:
    """
    1. Single Overpass query (tag-based, no name-regex) with 429 retry.
    2. Parse and filter low-quality entries.
    3. Deduplicate by OSM ID then by normalised name.
    4. Sort: preferred chains first, then distance ascending.
    5. Return all legitimate results.
    """
    raw_elements = await _overpass_gyms(lat, lng, int(radius_km * 1000))

    gyms: List[dict] = []
    seen_osm_ids: set[str] = set()
    seen_names: set[str] = set()

    for el in raw_elements:
        gym = _parse_overpass_element(el, lat, lng)
        if gym is None:
            continue

        if gym["osm_id"] in seen_osm_ids:
            continue
        seen_osm_ids.add(gym["osm_id"])

        if not _is_quality_result(gym):
            continue

        key = gym["name"].strip().lower()
        if key in seen_names:
            continue
        seen_names.add(key)

        gyms.append(gym)

    gyms.sort(key=_sort_key)
    return gyms
