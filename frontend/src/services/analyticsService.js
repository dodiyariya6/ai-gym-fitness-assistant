// src/services/analyticsService.js
/*
==================================================
IFA — Intelligent Fitness Assistant

File: analyticsService.js

Purpose:
Communicates with the backend
Analytics API.

Functionality:
- Fetches user analytics.
- Retrieves dashboard metrics.
- Retrieves wellness data.
- Returns analytics information.

Responsibilities:
API communication
Analytics retrieval

Used By:
Dashboard page
Reports page

==================================================
*/
import api from "./api";

export const getAnalytics = async () => {
  try {
    // BUG FIX: Disable all HTTP caching so revisiting the Dashboard or
    // Reports page always fetches fresh data from the backend.
    // Without these headers, browsers and axios adapters may serve a
    // stale cached response, causing 7-day rolling averages to appear as 0
    // even though the database contains today's habit records.
    const response = await api.get("/analytics", {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
      // Append a timestamp param so the URL is unique on every call,
      // defeating any URL-keyed cache layer (CDN, service worker, axios cache).
      params: { _t: Date.now() },
    });

    return response.data;
  } catch (error) {
    console.error("Analytics Service Error:", error);
    throw error;
  }
};

// Grounded, structured AI insights (see ai_insight_service.py). Falls back
// to deterministic-only insights server-side if Gemini is unavailable —
// the response always has the same shape, so the caller never needs to
// special-case failure beyond the normal try/catch.
export const getInsights = async () => {
  try {
    const response = await api.get("/analytics/insights");
    return response.data;
  } catch (error) {
    console.error("Insights Service Error:", error);
    throw error;
  }
};

// Deterministic, uncapped, per-exercise progressive-overload trend — no AI
// call (see progressive_overload_service.py). Used by the Workout page's
// Coach Notes panel, which wants every exercise, not just whichever made
// the capped /analytics/insights top-6.
export const getProgressiveOverload = async () => {
  try {
    const response = await api.get("/analytics/progressive-overload");
    return response.data;
  } catch (error) {
    console.error("Progressive Overload Service Error:", error);
    throw error;
  }
};