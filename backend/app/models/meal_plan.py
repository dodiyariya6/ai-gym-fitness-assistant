# app/models/meal_plan.py
"""
==================================================
IFA — Intelligent Fitness Assistant

File: meal_plan.py

Purpose:
Defines the MealPlan database model used to store
AI-generated meal plans and grocery lists for users.

Functionality:
- Stores personalized meal plans.
- Stores user fitness goals.
- Stores selected diet preferences.
- Stores generated grocery lists.
- Records meal plan creation timestamps.
- Associates meal plans with individual users.

Database Table:
meal_plans

Used By:
diet_service.py
diet_router.py
reports system

==================================================
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class MealPlan(Base):

    __tablename__ = "meal_plans"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    goal = Column(String, nullable=False)

    diet_type = Column(String, nullable=False)

    meal_plan = Column(Text, nullable=False)

    grocery_list = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
