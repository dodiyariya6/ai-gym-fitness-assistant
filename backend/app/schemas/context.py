# app/schemas/context.py
"""
==================================================
IFA — Intelligent Fitness Assistant

File: context.py  (schemas)

Purpose:
Defines the UserFitnessContext — the single,
compact, deterministic representation of "what the
AI needs to know about this user" that is handed to
Gemini for coaching and insight generation.

Functionality:
- Structures profile goals and personalized targets.
- Structures recent workout and habit summaries.
- Structures wellness score and trend direction.
- Flags whether real history exists, so AI never
  invents workouts/habits for a new user.
- Renders a compact natural-language prompt block
  via to_prompt_context().

Used By:
context_service.py
ai_insight_service.py
fitness_chat_service.py

==================================================
"""

from typing import List, Optional
from pydantic import BaseModel


class GoalsSummary(BaseModel):
    fitness_goals: List[str] = []
    activity_level: Optional[str] = None
    water_goal: Optional[float] = None
    sleep_goal: Optional[float] = None
    step_goal: Optional[int] = None
    calorie_goal: Optional[int] = None
    bmi: Optional[float] = None
    bmi_category: Optional[str] = None


class WorkoutSummary(BaseModel):
    total_workouts: int = 0
    avg_form_score: float = 0.0
    weekly_workouts: int = 0
    last_exercise: Optional[str] = None
    last_workout_date: Optional[str] = None
    workouts_trend: Optional[str] = None
    form_trend: Optional[str] = None


class HabitSummary(BaseModel):
    avg_sleep_7d: Optional[float] = None
    avg_water_7d: Optional[float] = None
    avg_steps_7d: Optional[float] = None
    logging_streak: int = 0
    consistency_streak: int = 0
    sleep_trend: Optional[str] = None
    water_trend: Optional[str] = None
    steps_trend: Optional[str] = None


class WellnessSummary(BaseModel):
    score: int = 0
    completion_trend: Optional[str] = None


class UserFitnessContext(BaseModel):
    user_id: int
    first_name: Optional[str] = None

    # Explicit flags so downstream AI never hallucinates history that
    # doesn't exist for a brand-new user.
    has_profile: bool = False
    has_workout_history: bool = False
    has_habit_history: bool = False

    goals: GoalsSummary
    workouts: WorkoutSummary
    habits: HabitSummary
    wellness: WellnessSummary

    recent_achievements: List[str] = []

    # Deterministic, already-computed findings — AI only interprets these,
    # it never recalculates them.
    weaknesses: List[str] = []
    improvements: List[str] = []

    def to_prompt_context(self) -> str:
        """
        Renders a compact, deterministic bullet-list block safe to hand to
        Gemini. Contains no raw DB rows — only pre-aggregated facts.
        """
        lines: List[str] = []
        name = self.first_name or "the user"
        lines.append(f"User: {name}")

        if self.goals.fitness_goals:
            goals_str = ", ".join(self.goals.fitness_goals)
        else:
            goals_str = "not set"
        activity = self.goals.activity_level or "not set"
        lines.append(f"Goals: {goals_str} (activity level: {activity})")

        if any(
            [
                self.goals.water_goal,
                self.goals.sleep_goal,
                self.goals.step_goal,
                self.goals.calorie_goal,
            ]
        ):
            targets = []
            if self.goals.water_goal:
                targets.append(f"{self.goals.water_goal} L water/day")
            if self.goals.sleep_goal:
                targets.append(f"{self.goals.sleep_goal} h sleep/night")
            if self.goals.step_goal:
                targets.append(f"{self.goals.step_goal:,} steps/day")
            if self.goals.calorie_goal:
                targets.append(f"{self.goals.calorie_goal} kcal/day")
            lines.append("Personal targets: " + ", ".join(targets))

        if self.goals.bmi:
            lines.append(f"BMI: {self.goals.bmi} ({self.goals.bmi_category})")

        if not self.has_workout_history:
            lines.append("Workout history: none logged yet.")
        else:
            w = self.workouts
            last = ""
            if w.last_exercise:
                last = f" Last exercise: {w.last_exercise} on {w.last_workout_date}."
            lines.append(
                f"Workout history: {w.total_workouts} total, "
                f"{w.weekly_workouts} in the last 7 days, "
                f"avg form score {w.avg_form_score}%.{last}"
            )

        if not self.has_habit_history:
            lines.append("Habit history: none logged yet.")
        else:
            h = self.habits
            lines.append(
                "Habit history (last 7 days): "
                f"sleep avg {h.avg_sleep_7d}h, water avg {h.avg_water_7d}L, "
                f"steps avg {h.avg_steps_7d}. "
                f"Logging streak: {h.logging_streak} days. "
                f"Consistency streak: {h.consistency_streak} days."
            )

        lines.append(f"Wellness score: {self.wellness.score}/100.")

        if self.recent_achievements:
            lines.append("Recent achievements: " + ", ".join(self.recent_achievements))

        if self.weaknesses:
            lines.append("Noted weaknesses (deterministic, already computed):")
            for w in self.weaknesses:
                lines.append(f"  - {w}")

        if self.improvements:
            lines.append("Noted improvements (deterministic, already computed):")
            for i in self.improvements:
                lines.append(f"  - {i}")

        return "\n".join(lines)
