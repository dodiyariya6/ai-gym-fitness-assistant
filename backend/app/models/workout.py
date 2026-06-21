# app/models/workout.py
"""
==================================================
AI Gym & Fitness Assistant

File: workout.py

Purpose:
Defines the Workout database model used to store
user workout sessions and performance metrics.

Functionality:
- Stores workout details and exercise information.
- Stores sets, reps and workout duration.
- Stores backend-calculated calorie values.
- Stores AI-generated form scores.
- Stores workout notes and dates.
- Associates workout records with individual users.

Database Table:
workouts

Used By:
workout_service.py
workout_router.py
webcam AI trainer
dashboard analytics
reports system
wellness score calculation

==================================================
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class Workout(Base):
    __tablename__ = "workouts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    exercise_name = Column(String, nullable=False)
    sets = Column(Integer, default=0)
    reps = Column(Integer, default=0)

    duration = Column(String, nullable=True)

    calories_burned = Column(Integer, default=0)

    form_score = Column(Integer, nullable=True, default=None)

    notes = Column(String, default="")
    workout_date = Column(String, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
