# app/schemas/diet.py
"""
==================================================
AI Gym & Fitness Assistant

File: diet.py

Purpose:
Defines Pydantic schemas used for diet analysis,
calorie calculations and AI meal planning.

Functionality:
- Validates diet-related user inputs.
- Defines BMI response structures.
- Defines BMR response structures.
- Defines TDEE response structures.
- Defines macronutrient response structures.
- Defines meal plan request formats.
- Defines grocery list request formats.
- Standardizes data exchanged between backend and frontend.

Data Models:
DietInput
BMIResponse
BMRResponse
TDEEResponse
MacroResponse
MealPlanRequest
GroceryRequest

Used By:
diet_service.py
diet.py router
Dietician page

==================================================
"""

from pydantic import BaseModel, Field


class DietInput(BaseModel):
    age: int = Field(gt=0)
    gender: str  # "male" | "female" | "non-binary"
    weight: float = Field(gt=0)
    height: float = Field(gt=0)
    activity_level: str


class BMIResponse(BaseModel):
    bmi: float
    category: str


class BMRResponse(BaseModel):
    bmr: float


class TDEEResponse(BaseModel):
    tdee: float


class MacroResponse(BaseModel):
    protein: float
    carbs: float
    fats: float


class MealPlanRequest(BaseModel):
    age: int = Field(gt=0)
    gender: str  # "male" | "female" | "non-binary"
    weight: float = Field(gt=0)
    height: float = Field(gt=0)
    goal: str
    diet_type: str


class GroceryRequest(BaseModel):
    meal_plan: str
