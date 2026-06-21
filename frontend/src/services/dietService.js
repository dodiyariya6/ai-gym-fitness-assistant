// src/services/dietService.js
/*
==================================================
AI Gym & Fitness Assistant

File: dietService.js

Purpose:
Communicates with the backend
Diet API.

Functionality:
- Generates AI meal plans.
- Generates grocery lists.
- Returns nutrition data.

Responsibilities:
API communication
Meal plan generation
Grocery list generation

Used By:
Dietician page

==================================================
*/
import api from "./api";

export const generateMealPlan = async (data) => {

  try {

    const response = await api.post(

      "/diet/meal-plan",

      data

    );

    return response.data;

  }

  catch (error) {

    console.error(

      "Diet Service Error:",

      error

    );

    throw error;

  }

};


export const generateGroceryList = async (

  mealPlan

) => {

  try {

    const response = await api.post(

      "/diet/grocery-list",

      {

        meal_plan: mealPlan

      }

    );

    return response.data;

  }

  catch (error) {

    console.error(

      "Diet Service Error:",

      error

    );

    throw error;

  }

};