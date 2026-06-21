// src/services/gymFinderService.js
/*
==================================================
AI Gym & Fitness Assistant

File: gymFinderService.js

Purpose:
Communicates with the backend
Gym Finder API and provides
location utilities.

Functionality:
- Retrieves profile location.
- Searches nearby gyms.
- Builds Google Maps links.
- Handles API responses.
- Handles authentication headers.

Responsibilities:
API communication
Gym search
Location handling

Used By:
GymFinder page

==================================================
*/
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    ""
  );
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

async function handleResponse(res) {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body.detail || message;
    } catch (_) {
      // ignore parse error — use default message
    }
    throw new Error(message);
  }
  return res.json();
}

export const gymFinderService = {
  /**
   * Fallback location lookup — used ONLY when browser geolocation is
   * denied or unavailable. Reads the user's city from their Profile and
   * geocodes it via Nominatim (OpenStreetMap). No API key required.
   */
  async getProfileLocation() {
    const res = await fetch(`${API_BASE}/gym-finder/profile-location`, {
      headers: authHeaders(),
    });
    return handleResponse(res);
  },

  /**
   * Search for nearby gyms via Overpass API.
   * @param {Object} params
   * @param {number} params.radiusKm  - 1–10
   * @param {number} params.lat       - resolved location (browser or profile)
   * @param {number} params.lng
   */
  async findGyms({ radiusKm, lat, lng }) {
    const params = new URLSearchParams();
    params.set("radius_km", String(radiusKm));
    params.set("lat", String(lat));
    params.set("lng", String(lng));

    const res = await fetch(
      `${API_BASE}/gym-finder/gyms?${params.toString()}`,
      { headers: authHeaders() },
    );
    return handleResponse(res);
  },

  /**
   * Build a Google Maps search URL for a gym.
   *
   * Priority:
   *  1. name + address  →  named place result page (best UX)
   *  2. name only       →  place search result
   *  3. lat,lng         →  coordinate pin fallback
   *
   * No Maps JS API key required — this is a plain deep-link.
   * Always opens in a new tab (target="_blank" set in JSX).
   *
   * @param {number} lat
   * @param {number} lng
   * @param {string|null} name
   * @param {string|null} address
   */
  getGoogleMapsUrl(lat, lng, name = null, address = null) {
    const base = "https://www.google.com/maps/search/?api=1&query=";

    if (name && address) {
      // e.g. "Cult.fit, Kachiguda, Hyderabad"
      const query = encodeURIComponent(`${name}, ${address}`);
      return `${base}${query}`;
    }

    if (name) {
      const query = encodeURIComponent(name);
      return `${base}${query}`;
    }

    // Final fallback: raw coordinates
    return `${base}${lat},${lng}`;
  },
};