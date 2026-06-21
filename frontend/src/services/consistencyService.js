// src/services/consistencyService.js
/*
==================================================
AI Gym & Fitness Assistant

File: consistencyService.js

Purpose:
Communicates with the backend
Consistency API.

Functionality:
- Fetches consistency statistics.
- Retrieves streak data.
- Retrieves daily breakdown data.

Responsibilities:
API communication
Consistency retrieval

Used By:
Dashboard page

==================================================
*/
import api from "./api";

export async function getConsistency() {
  const res = await api.get("/consistency/");
  return res.data;
}