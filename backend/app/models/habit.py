# app/models/habit.py
"""
==================================================
AI Gym & Fitness Assistant

File: habit.py

Purpose:
Defines the Habit database model used to store
daily health and fitness tracking information
for each user.

Functionality:
- Stores daily water intake.
- Stores sleep duration.
- Stores daily step count.
- Tracks workout completion status.
- Stores habit records by date.
- Associates habit entries with individual users.

Database Table:
habits

Used By:
habit_service.py
habit_router.py
dashboard analytics
reports system
wellness score calculation

==================================================
"""

from sqlalchemy import Column, Integer, Float, Boolean, Date, ForeignKey
from app.database import Base


class Habit(Base):
    __tablename__ = "habits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # ORM layer (if the 422 was somehow bypassed) and caused Pydantic to
    # reject decimal inputs with HTTP 422 when validation ran first.
    # Changed to Float so the full decimal value is stored and returned.
    water_intake = Column(Float, nullable=False)  # was: Integer
    sleep_hours = Column(Float, nullable=False)  # was: Integer

    steps = Column(Integer, nullable=False)  # unchanged
    workout_done = Column(Boolean, default=False, nullable=False)
    date = Column(Date, nullable=False)
