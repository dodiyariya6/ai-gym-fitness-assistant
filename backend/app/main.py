# app/main.py
"""
==================================================
AI Gym & Fitness Assistant

File: main.py

Purpose:
Initializes the FastAPI application and
registers all project modules.

Functionality:
- Creates the FastAPI application.
- Registers database models.
- Creates database tables.
- Configures CORS middleware.
- Registers all API routers.
- Provides a health check endpoint.

Responsibilities:
Application initialization
Database initialization
Router registration
CORS configuration

Used By:
Entire backend application

==================================================
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine

from app.models.user import User
from app.models.meal_plan import MealPlan
from app.models.workout import Workout
from app.models.habit import Habit
from app.models.profile import Profile
from app.models.achievement import AchievementProgress

from app.routers import auth
from app.routers import diet
from app.routers import pose
from app.routers import workout
from app.routers import fitness_chat
from app.routers import habit
from app.routers import analytics
from app.routers import profile as profile_router
from app.routers import consistency
from app.routers import achievements
from app.routers import gym_finder  # ← NEW

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://ai-gym-fitness-assistant-beta.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(diet.router)
app.include_router(pose.router)
app.include_router(workout.router)
app.include_router(fitness_chat.router)
app.include_router(habit.router)
app.include_router(analytics.router)
app.include_router(profile_router.router)
app.include_router(consistency.router)
app.include_router(achievements.router)
app.include_router(gym_finder.router)  # ← NEW


@app.get("/")
def root():
    return {"message": "API Running"}
