// src/services/gymFinderService.js
/*
==================================================
IFA — Intelligent Fitness Assistant

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

Responsibilities:
API communication
Gym search
Location handling

Used By:
GymFinder page

==================================================
*/
import api from "./api";

// Migrated from raw fetch() to the shared axios client (api.js) so this
// service gets the same automatic Authorization header injection and the
// same global 401 handling as every other authenticated request, instead of
// duplicating that logic here. Public function signatures, return shapes,
// and thrown-error messages are unchanged (same "<detail> or Request failed
// (<status>)" contract the previous handleResponse() produced).

function toError(error) {
  const detail = error.response?.data?.detail;
  const status = error.response?.status ?? "unknown";
  return new Error(detail || `Request failed (${status})`);
}

export const gymFinderService = {
  /**
   * Fallback location lookup — used ONLY when browser geolocation is
   * denied or unavailable. Reads the user's city from their Profile and
   * geocodes it via Nominatim (OpenStreetMap). No API key required.
   */
  async getProfileLocation() {
    try {
      const res = await api.get("/gym-finder/profile-location");
      return res.data;
    } catch (error) {
      throw toError(error);
    }
  },

  /**
   * Search for nearby gyms via Overpass API.
   * @param {Object} params
   * @param {number} params.radiusKm  - 1–10
   * @param {number} params.lat       - resolved location (browser or profile)
   * @param {number} params.lng
   */
  async findGyms({ radiusKm, lat, lng }) {
    try {
      const res = await api.get("/gym-finder/gyms", {
        params: { radius_km: radiusKm, lat, lng },
      });
      return res.data;
    } catch (error) {
      throw toError(error);
    }
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
