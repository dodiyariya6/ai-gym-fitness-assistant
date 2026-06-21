# app/models/profile.py
"""
==================================================
AI Gym & Fitness Assistant

File: profile.py

Purpose:
Defines the Profile database model used to store
personal, fitness and location information for users.

Functionality:
- Stores user personal information.
- Stores fitness goals and activity level.
- Stores user location details.
- Stores AI-generated health targets.
- Maintains a one-to-one relationship with users.
- Acts as the central profile data source for the application.

Database Table:
profiles

Used By:
profile_service.py
profile_router.py
diet_service.py
habit_service.py
dashboard analytics
reports system
gym finder

==================================================
"""

from sqlalchemy import Column, Integer, String, Float, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    name = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)  # "male" | "female" | "non-binary"
    height = Column(Float, nullable=True)  # centimetres
    weight = Column(Float, nullable=True)  # kilograms

    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    country = Column(String, nullable=True)

    fitness_goals = Column(JSON, nullable=True)  # List[str], 1-3 items
    activity_level = Column(String, nullable=True)

    water_goal = Column(Float, nullable=True)  # litres / day
    sleep_goal = Column(Float, nullable=True)  # hours / night
    step_goal = Column(Integer, nullable=True)  # steps / day
    calorie_goal = Column(Integer, nullable=True)  # kcal / day

    user = relationship("User", back_populates="profile")
