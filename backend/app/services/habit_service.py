# app/services/habit_service.py
"""
==================================================
AI Gym & Fitness Assistant

File: habit_service.py

Purpose:
Provides habit management functionality
for logging and updating daily activities.

Functionality:
- Creates habit entries.
- Updates existing habit entries.
- Retrieves habit history.
- Prevents duplicate entries.
- Retrieves habits by date.

Responsibilities:
Habit management
Duplicate prevention
History retrieval
Habit updates

Used By:
habit.py router
Habits page
Dashboard
AI Wellness Score
AI Consistency Tracker

==================================================
"""

from fastapi import HTTPException, status
from app.models.habit import Habit


def get_habit_by_user_and_date(db, user_id, date):
    return db.query(Habit).filter(Habit.user_id == user_id, Habit.date == date).first()


def create_habit(db, user_id, habit_data):
    existing = get_habit_by_user_and_date(db, user_id, habit_data.date)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A habit entry for this date already exists.",
        )

    habit = Habit(
        user_id=user_id,
        water_intake=habit_data.water_intake,
        sleep_hours=habit_data.sleep_hours,
        steps=habit_data.steps,
        workout_done=habit_data.workout_done,
        date=habit_data.date,
    )
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return habit


def update_habit(db, user_id, habit_id, habit_data):
    habit = (
        db.query(Habit).filter(Habit.id == habit_id, Habit.user_id == user_id).first()
    )
    if not habit:
        return None

    habit.water_intake = habit_data.water_intake
    habit.sleep_hours = habit_data.sleep_hours
    habit.steps = habit_data.steps
    habit.workout_done = habit_data.workout_done
    db.commit()
    db.refresh(habit)
    return habit


def get_user_habits(db, user_id):
    return (
        db.query(Habit)
        .filter(Habit.user_id == user_id)
        .order_by(Habit.date.desc())
        .all()
    )
