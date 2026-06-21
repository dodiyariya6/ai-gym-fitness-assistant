// src/services/workoutService.js
/*
==================================================
AI Gym & Fitness Assistant

File: workoutService.js

Purpose:
Communicates with the backend
Workout API.

Functionality:
- Saves workout sessions.
- Retrieves workout history.
- Returns workout data.

Responsibilities:
API communication
Workout management
History retrieval

Used By:
Workout page
Webcam page

==================================================
*/
import api from "./api";

export const saveWorkout = async (

  workoutData

) => {

  try {

    const response = await api.post(

      "/workout/save",

      workoutData

    );

    return response.data;

  }

  catch (error) {

    console.error(

      "Workout Service Error:",

      error

    );

    throw error;

  }

};

export const getWorkoutHistory = async () => {

  try {

    const response = await api.get(

      "/workout/history"

    );

    return response.data;

  }

  catch (error) {

    console.error(

      "Workout Service Error:",

      error

    );

    throw error;

  }

};