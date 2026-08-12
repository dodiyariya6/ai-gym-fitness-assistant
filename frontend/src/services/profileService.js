// src/services/profileService.js
/*
==================================================
IFA — Intelligent Fitness Assistant

File: profileService.js

Purpose:
Communicates with the backend
Profile API.

Functionality:
- Fetches user profiles.
- Saves profile information.
- Generates AI daily targets.
- Retrieves stored targets.

Responsibilities:
API communication
Profile management
Target generation

Used By:
Profile page
Dietician page
Dashboard page
GymFinder page
Habits page

==================================================
*/
import api from "./api";

// Migrated from raw fetch() to the shared axios client (api.js) so this
// service gets the same automatic Authorization header injection and the
// same global 401 handling as every other authenticated request, instead of
// duplicating that logic here. Public function signatures, return shapes,
// and thrown-error messages are unchanged.

export async function getProfile() {
  try {
    const res = await api.get("/profile/me");
    return res.data;
  } catch (error) {
    if (error.response?.status === 404) return null;
    throw new Error("Failed to fetch profile", { cause: error });
  }
}

export async function saveProfile(data) {
  try {
    const res = await api.post("/profile/", data);
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || "Failed to save profile", {
      cause: error,
    });
  }
}

export async function generateTargets() {
  try {
    const res = await api.get("/profile/targets");
    return res.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail || "Failed to generate targets",
      { cause: error },
    );
  }
}

export async function getStoredTargets() {
  try {
    const res = await api.get("/profile/targets/stored");
    return res.data;
  } catch (error) {
    if (error.response?.status === 404) return null;
    throw new Error("Failed to fetch targets", { cause: error });
  }
}
