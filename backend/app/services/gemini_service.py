# app/services/gemini_service.py
"""
==================================================
AI Gym & Fitness Assistant

File: gemini_service.py

Purpose:
Provides Google Gemini integration for
AI-generated meal plans and grocery lists.

Functionality:
- Initializes the Gemini AI model.
- Generates personalized meal plans.
- Generates grocery lists.
- Uses user profile information.
- Returns structured AI responses.

Responsibilities:
Gemini integration
Meal plan generation
Grocery list generation
AI response generation

Used By:
diet.py router
fitness_chat_service.py
Dietician page
Virtual Gym Buddy

==================================================
"""

import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=os.getenv("GEMINI_API_KEY"),
)


def generate_meal_plan(age, gender, weight, height, goal, diet_type):
    """
    Gender is passed explicitly so that calorie targets, protein requirements,
    and portion sizes are appropriate for the user's physiology.
    Non-binary users receive a plan based on the midpoint BMR (see diet_service.py).
    """
    prompt = f"""
You are an expert nutritionist.
Create a 1-day meal plan.

Age: {age}
Gender: {gender}
Weight: {weight} kg
Height: {height} cm
Goal: {goal}
Diet Type: {diet_type}

Use gender-appropriate calorie targets and protein recommendations.
For non-binary individuals, use a calorie target midway between typical
male and female recommendations for this body composition and goal.

Return ONLY the meal plan.
Do NOT explain:
- BMI
- BMR
- TDEE
- Formulas
- Assumptions
- Nutrition theory

Format exactly like this:
Breakfast:
- food item
- food item

Mid-Morning Snack:
- food item

Lunch:
- food item
- food item

Evening Snack:
- food item

Dinner:
- food item
- food item

Total Calories:
Total Protein:
"""
    response = llm.invoke(prompt)
    return response.content


def generate_grocery_list(meal_plan):
    prompt = f"""
Extract all ingredients from the meal plan below.
Combine duplicates.
Return ONLY a grocery list.

Meal Plan:
{meal_plan}
"""
    response = llm.invoke(prompt)
    return response.content
