// src/services/achievementService.js
/*
==================================================
AI Gym & Fitness Assistant

File: achievementService.js

Purpose:
Communicates with the backend
Achievements API.

Functionality:
- Fetches user achievements.
- Retrieves achievement progress.
- Returns achievement data.

Responsibilities:
API communication
Achievement retrieval

Used By:
Dashboard page

==================================================
*/
import api from "./api";

export async function getAchievements() {
  const res = await api.get("/achievements/");
  return res.data;
}