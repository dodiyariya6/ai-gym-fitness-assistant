// src/services/analyticsService.js
/*
==================================================
AI Gym & Fitness Assistant

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

    const response = await api.get(

      "/analytics"

    );

    return response.data;

  }

  catch (error) {

    console.error("Analytics Service Error:", error);

    throw error;

  }

};