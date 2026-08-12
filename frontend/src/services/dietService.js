// src/services/dietService.js
/*
==================================================
IFA — Intelligent Fitness Assistant

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

  mealPlan,

  planId = null

) => {

  try {

    const response = await api.post(

      "/diet/grocery-list",

      {

        meal_plan: mealPlan,

        plan_id: planId,

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

// Recent Plans — reuses persisted MealPlan rows the backend already
// creates on every generation. Loading a plan never calls Gemini again.
export const getMealPlanHistory = async ({ limit = 10, offset = 0 } = {}) => {
  try {
    const response = await api.get("/diet/history", {
      params: { limit, offset },
    });
    return response.data;
  } catch (error) {
    console.error("Diet Service Error:", error);
    throw error;
  }
};

export const getMealPlanById = async (planId) => {
  try {
    const response = await api.get(`/diet/history/${planId}`);
    return response.data;
  } catch (error) {
    console.error("Diet Service Error:", error);
    throw error;
  }
};

export const deleteMealPlan = async (planId) => {
  try {
    await api.delete(`/diet/history/${planId}`);
  } catch (error) {
    console.error("Diet Service Error:", error);
    throw error;
  }
};