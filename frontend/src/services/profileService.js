// src/services/profileService.js
/*
==================================================
AI Gym & Fitness Assistant

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

==================================================
*/
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getProfile() {
  const res = await fetch(`${API_BASE}/profile/me`, {
    headers: authHeaders(),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

export async function saveProfile(data) {
  const res = await fetch(`${API_BASE}/profile/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to save profile");
  }
  return res.json();
}

export async function generateTargets() {
  const res = await fetch(`${API_BASE}/profile/targets`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to generate targets");
  }
  return res.json();
}

export async function getStoredTargets() {
  const res = await fetch(`${API_BASE}/profile/targets/stored`, {
    headers: authHeaders(),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch targets");
  return res.json();
}