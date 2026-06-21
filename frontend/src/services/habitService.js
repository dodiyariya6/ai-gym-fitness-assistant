// src/services/habitService.js
/*
==================================================
AI Gym & Fitness Assistant

File: habitService.js

Purpose:
Communicates with the backend
Habit Tracker API.

Functionality:
- Logs daily habits.
- Updates existing habits.
- Retrieves habit history.

Responsibilities:
API communication
Habit management
History retrieval

Used By:
Habits page

==================================================
*/
import api from "./api";
export const logHabit = async (
  habitData
) => {
  try {
    const response = await api.post(
      "/habit/log",
      habitData
    );
    return response.data;
  }
  catch (error) {
    console.error(
      "Habit Service Error:",
      error
    );
    throw error;
  }
};

export const updateHabit = async (
  habitId,
  habitData
) => {
  try {
    const response = await api.put(
      `/habit/log/${habitId}`,
      habitData
    );
    return response.data;
  }
  catch (error) {
    console.error(
      "Habit Service Error:",
      error
    );
    throw error;
  }
};

export const getHabitHistory = async () => {
  try {
    const response = await api.get(
      "/habit/history"
    );
    return response.data;
  }
  catch (error) {
    console.error(
      "Habit Service Error:",
      error
    );
    throw error;
  }
};