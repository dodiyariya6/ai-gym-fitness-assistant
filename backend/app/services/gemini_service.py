# app/services/gemini_service.py
"""
==================================================
IFA — Intelligent Fitness Assistant

File: gemini_service.py

Purpose:
Provides Google Gemini integration for
AI-generated meal plans and grocery lists.

Functionality:
- Initializes the Gemini AI model.
- Generates personalized meal plans.
- Generates grocery lists.
- Uses user profile information.
- Returns structured AI responses.
- Exposes GEMINI_AVAILABLE + safe_invoke() so every call
  site (meal plan, grocery, chat, insights) shares one
  consistent timeout/failure-handling path (P2.7).

Responsibilities:
Gemini integration
Meal plan generation
Grocery list generation
AI response generation
AI failure handling

Used By:
diet.py router
fitness_chat_service.py
ai_insight_service.py
Dietician page
Virtual Gym Buddy

==================================================
"""

import asyncio
import os

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-2.5-flash"

# Used by every AI-dependent service to skip the network call entirely (and
# fall back immediately) when no key is configured, instead of waiting on a
# call that is guaranteed to fail.
GEMINI_AVAILABLE = bool(GEMINI_API_KEY)

DEFAULT_TIMEOUT_SECONDS = 20


class AIUnavailableError(Exception):
    """Raised by safe_invoke() when Gemini is not configured, times out, or
    fails for any reason. Callers catch this single exception type instead
    of guessing at provider-specific exception classes — keeps provider
    internals out of every call site and out of any error surfaced to the
    frontend."""


def _new_client(structured_model=None):
    """
    Builds a fresh Gemini client for this call instead of reusing one
    long-lived instance.

    A module-level singleton client used to be constructed once at import
    time. langchain-google-genai's transport (an httpx.AsyncClient, via the
    google-genai SDK) binds to whichever asyncio event loop is running the
    first time it's used, and raises "Event loop is closed" if that same
    client is reused later on a different loop/request context — confirmed
    reproducible: first Gemini call of a process succeeded, every call after
    it failed this way. Construction itself does no network I/O (the API key
    is only used once a request is actually sent), so building a client per
    call costs nothing meaningful while removing the failure mode entirely.
    """
    client = ChatGoogleGenerativeAI(model=GEMINI_MODEL, google_api_key=GEMINI_API_KEY)
    return client.with_structured_output(structured_model) if structured_model else client


async def safe_invoke(prompt: str, structured_model=None, timeout: int = DEFAULT_TIMEOUT_SECONDS):
    """
    Invokes Gemini with a timeout and a single normalized failure path.

    - structured_model=None  → returns the raw text response (`.content`).
    - structured_model=<PydanticModel> → returns a validated instance of
      that model (uses langchain's with_structured_output so Gemini's JSON
      response is schema-checked before it ever reaches a router/frontend).

    Never raises Gemini/provider-specific exceptions — always raises
    AIUnavailableError so callers have exactly one thing to catch.
    """
    if not GEMINI_AVAILABLE:
        raise AIUnavailableError("Gemini API key is not configured.")

    try:
        target = _new_client(structured_model)
        response = await asyncio.wait_for(target.ainvoke(prompt), timeout=timeout)
        return response if structured_model else response.content
    except AIUnavailableError:
        raise
    except Exception as exc:  # noqa: BLE001 — intentionally broad: timeouts,
        # quota errors, malformed structured output and transport failures
        # must all collapse to the same safe fallback path.
        print(f"Gemini call failed: {type(exc).__name__}: {exc}")
        raise AIUnavailableError("Gemini request failed.") from exc


async def generate_meal_plan(
    age,
    gender,
    weight,
    height,
    goal,
    diet_type,
    activity_level=None,
    target_calories=None,
):
    """
    Gender is passed explicitly so that calorie targets, protein requirements,
    and portion sizes are appropriate for the user's physiology.
    Non-binary users receive a plan based on the midpoint BMR (see diet_service.py).

    activity_level and target_calories are optional, Profile-derived context:
    target_calories reuses the same calorie_goal already computed by
    profile_service.calculate_targets() (TDEE + goal adjustment) instead of
    letting Gemini re-derive its own number from scratch, so the Dietician
    and the Profile page's daily calorie target don't disagree.
    """
    extra_context = ""
    if activity_level:
        extra_context += f"Activity Level: {activity_level}\n"
    if target_calories:
        extra_context += (
            f"Target Daily Calories: {target_calories} kcal "
            "(this is the user's personalized daily target — build the plan "
            "to land close to this number instead of estimating your own)\n"
        )

    prompt = f"""
You are an expert nutritionist.
Create a 1-day meal plan.

Age: {age}
Gender: {gender}
Weight: {weight} kg
Height: {height} cm
Goal: {goal}
Diet Type: {diet_type}
{extra_context}
Use gender-appropriate calorie targets and protein recommendations.
For non-binary individuals, use a calorie target midway between typical
male and female recommendations for this body composition and goal.

Return ONLY the meal plan.
Do NOT explain:
- BMI
- BMR
- TDEE
- Formulas
- Assumptions
- Nutrition theory

Format exactly like this:
Breakfast:
- food item
- food item

Mid-Morning Snack:
- food item

Lunch:
- food item
- food item

Evening Snack:
- food item

Dinner:
- food item
- food item

Total Calories:
Total Protein:
"""
    return await safe_invoke(prompt)


async def generate_grocery_list(meal_plan):
    prompt = f"""
Extract all ingredients from the meal plan below.
Combine duplicates.
Return ONLY a grocery list.

Meal Plan:
{meal_plan}
"""
    return await safe_invoke(prompt)
