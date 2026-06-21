# app/models/meal_plan.py
"""
==================================================
AI Gym & Fitness Assistant

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

from datetime import datetime

from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey

from app.database import Base


class MealPlan(Base):

    __tablename__ = "meal_plans"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    goal = Column(String, nullable=False)

    diet_type = Column(String, nullable=False)

    meal_plan = Column(Text, nullable=False)

    grocery_list = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
