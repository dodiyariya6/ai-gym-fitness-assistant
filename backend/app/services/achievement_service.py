# app/services/achievement_service.py
"""
==================================================
AI Gym & Fitness Assistant

File: achievement_service.py

Purpose:
Implements the AI achievement system by
evaluating user progress and unlocking badges.

Functionality:
- Defines achievement rules.
- Builds user achievement context.
- Evaluates unlock conditions.
- Updates achievement progress.
- Stores unlocked achievements.
- Returns achievement statistics.

Responsibilities:
Achievement evaluation
Progress tracking
Badge unlocking
Achievement persistence

Used By:
achievements.py router
Dashboard
AI Achievement System

==================================================
"""

from datetime import datetime

from app.models.achievement import AchievementProgress
from app.models.workout import Workout
from app.models.habit import Habit
from app.models.meal_plan import MealPlan
from app.services.profile_service import get_profile
from app.services.consistency_service import get_consistency


def _rule_first_workout(ctx):
    return min(ctx["total_workouts"], 1), 1


def _rule_hydration_hero(ctx):
    return min(ctx["water_goal_days_met"], 7), 7


def _rule_sleep_champion(ctx):
    return min(ctx["sleep_goal_days_met"], 7), 7


def _rule_consistency_star(ctx):
    return min(ctx["current_streak"], 7), 7


def _rule_weekly_warrior(ctx):
    return min(int(ctx["weekly_consistency_pct"]), 80), 80


def _rule_goal_crusher(ctx):
    return min(ctx["excellent_days"], 5), 5


def _rule_meal_planner(ctx):
    return min(ctx["meal_plan_count"], 1), 1


def _rule_habit_builder(ctx):
    return min(ctx["habit_log_count"], 14), 14


def _rule_step_master(ctx):
    return min(ctx["step_goal_days_met"], 10), 10


def _rule_ai_explorer(ctx):
    return min(ctx["ai_features_used"], 3), 3


ACHIEVEMENT_DEFINITIONS = [
    {
        "key": "first_workout",
        "title": "First Workout",
        "description": "Log your first workout.",
        "icon": "Dumbbell",
        "rule": _rule_first_workout,
    },
    {
        "key": "hydration_hero",
        "title": "Hydration Hero",
        "description": "Hit your water goal on 7 different days.",
        "icon": "Droplets",
        "rule": _rule_hydration_hero,
    },
    {
        "key": "sleep_champion",
        "title": "Sleep Champion",
        "description": "Hit your sleep goal on 7 different days.",
        "icon": "Moon",
        "rule": _rule_sleep_champion,
    },
    {
        "key": "consistency_star",
        "title": "Consistency Star",
        "description": "Reach a 7-day consistency streak.",
        "icon": "Flame",
        "rule": _rule_consistency_star,
    },
    {
        "key": "weekly_warrior",
        "title": "Weekly Warrior",
        "description": "Reach 80% weekly consistency.",
        "icon": "Award",
        "rule": _rule_weekly_warrior,
    },
    {
        "key": "goal_crusher",
        "title": "Goal Crusher",
        "description": "Achieve 5 Excellent Days (4/4 daily goals met).",
        "icon": "Medal",
        "rule": _rule_goal_crusher,
    },
    {
        "key": "meal_planner",
        "title": "Meal Planner",
        "description": "Generate your first AI meal plan.",
        "icon": "Utensils",
        "rule": _rule_meal_planner,
    },
    {
        "key": "habit_builder",
        "title": "Habit Builder",
        "description": "Log habits on 14 different days.",
        "icon": "BookOpen",
        "rule": _rule_habit_builder,
    },
    {
        "key": "step_master",
        "title": "Step Master",
        "description": "Hit your step goal on 10 different days.",
        "icon": "Footprints",
        "rule": _rule_step_master,
    },
    {
        "key": "ai_explorer",
        "title": "AI Explorer",
        "description": "Use 3 different AI-powered features.",
        "icon": "Sparkles",
        "rule": _rule_ai_explorer,
    },
]


def _build_context(db, user_id: int) -> dict:
    profile = get_profile(db, user_id)

    total_workouts = db.query(Workout).filter(Workout.user_id == user_id).count()
    meal_plan_count = db.query(MealPlan).filter(MealPlan.user_id == user_id).count()

    habits = db.query(Habit).filter(Habit.user_id == user_id).all()
    habit_log_count = len(habits)

    water_goal = profile.water_goal if profile and profile.water_goal else 2.0
    sleep_goal = profile.sleep_goal if profile and profile.sleep_goal else 7.0
    step_goal = profile.step_goal if profile and profile.step_goal else 6000

    water_goal_days_met = sum(1 for h in habits if (h.water_intake or 0) >= water_goal)
    sleep_goal_days_met = sum(1 for h in habits if (h.sleep_hours or 0) >= sleep_goal)
    step_goal_days_met = sum(1 for h in habits if (h.steps or 0) >= step_goal)

    consistency = get_consistency(db, user_id)
    excellent_days = sum(1 for d in consistency["daily_breakdown"] if d["score"] == 4)

    webcam_workout_used = (
        db.query(Workout)
        .filter(Workout.user_id == user_id, Workout.form_score.isnot(None))
        .count()
        > 0
    )
    ai_targets_generated = bool(profile and profile.water_goal)
    meal_plan_used = meal_plan_count > 0

    ai_features_used = sum([webcam_workout_used, ai_targets_generated, meal_plan_used])

    return {
        "total_workouts": total_workouts,
        "meal_plan_count": meal_plan_count,
        "habit_log_count": habit_log_count,
        "water_goal_days_met": water_goal_days_met,
        "sleep_goal_days_met": sleep_goal_days_met,
        "step_goal_days_met": step_goal_days_met,
        "current_streak": consistency["current_streak"],
        "weekly_consistency_pct": consistency["weekly_consistency_pct"],
        "excellent_days": excellent_days,
        "ai_features_used": ai_features_used,
    }


def evaluate_achievements(db, user_id: int) -> dict:
    """
    Recomputes every achievement rule, upserts AchievementProgress rows, and
    returns the full list. Called on every GET /achievements/, so unlocks
    happen automatically with no separate "check" trigger.
    """
    ctx = _build_context(db, user_id)

    existing = {
        row.achievement_key: row
        for row in db.query(AchievementProgress)
        .filter(AchievementProgress.user_id == user_id)
        .all()
    }

    results = []
    unlocked_count = 0

    for definition in ACHIEVEMENT_DEFINITIONS:
        current, target = definition["rule"](ctx)
        is_unlocked = current >= target

        row = existing.get(definition["key"])
        if not row:
            row = AchievementProgress(
                user_id=user_id,
                achievement_key=definition["key"],
                progress_target=target,
            )
            db.add(row)

        row.progress_current = current
        row.progress_target = target

        if is_unlocked and not row.unlocked:
            row.unlocked = True
            row.unlocked_at = datetime.utcnow()

        if row.unlocked:
            unlocked_count += 1

        results.append(
            {
                "key": definition["key"],
                "title": definition["title"],
                "description": definition["description"],
                "icon": definition["icon"],
                "unlocked": row.unlocked,
                "unlocked_at": row.unlocked_at,
                "progress_current": min(current, target),
                "progress_target": target,
            }
        )

    db.commit()

    return {
        "achievements": results,
        "unlocked_count": unlocked_count,
        "total_count": len(ACHIEVEMENT_DEFINITIONS),
    }
