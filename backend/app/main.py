# app/main.py
"""
==================================================
IFA — Intelligent Fitness Assistant

File: main.py

Purpose:
Initializes the FastAPI application, rate limiter, CORS, and registers all modules.
==================================================
"""

import logging
import traceback

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.database import Base, engine

# A bare print() previously stood in for real logging on unhandled
# exceptions — easy to lose on a hosted platform (Render) and gave no
# traceback, so a real 500 was effectively invisible after the fact. This
# gives every unhandled exception a full traceback plus request context in
# both the local console and Render's log viewer.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("ifa")

# Single source of truth for allowed browser origins — used by CORSMiddleware
# below AND by global_exception_handler() to add the same header to
# responses it builds directly. Starlette hoists a handler registered for
# the bare `Exception` type out to ServerErrorMiddleware, which wraps
# OUTSIDE CORSMiddleware — so without this, every unhandled 500 comes back
# with no Access-Control-Allow-Origin header at all, and the browser reports
# it as a CORS failure instead of surfacing the real error/status code.
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://ai-gym-fitness-assistant-beta.vercel.app",
]
from app.models.user import User
from app.models.meal_plan import MealPlan
from app.models.workout import Workout
from app.models.habit import Habit
from app.models.profile import Profile
from app.models.achievement import AchievementProgress
from app.models.chat import ChatSession, ChatMessage

from app.routers import auth
from app.routers import diet
from app.routers import workout
from app.routers import fitness_chat
from app.routers import habit
from app.routers import analytics
from app.routers import profile as profile_router
from app.routers import consistency
from app.routers import achievements
from app.routers import gym_finder

# Database Tables Initialization
Base.metadata.create_all(bind=engine)

# Rate Limiter Configuration
limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])

app = FastAPI(title="IFA — Intelligent Fitness Assistant API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Global 500 Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Full traceback + request context, not just a one-line message — this
    # is the only place an unhandled exception is ever recorded, so without
    # the traceback here there is no way to root-cause a real 500 afterward.
    logger.error(
        "Unhandled exception on %s %s (query=%s): %s\n%s",
        request.method,
        request.url.path,
        dict(request.query_params),
        exc,
        traceback.format_exc(),
    )
    response = JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again later."},
    )
    # This handler runs outside CORSMiddleware (see ALLOWED_ORIGINS comment
    # above), so it must set the CORS headers itself — otherwise the browser
    # blocks the response as a CORS error and hides the real 500 from the
    # frontend/devtools. Only echo the origin back if it's actually
    # allow-listed, same check CORSMiddleware itself performs — never "*".
    origin = request.headers.get("origin")
    if origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

# Strict CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    # Cache-Control/Pragma/Expires are added because analyticsService.js's
    # getAnalytics() sends them on every request to defeat HTTP caching —
    # without them here, the browser's preflight for that call fails with
    # "Disallowed CORS headers" before the request is ever sent.
    allow_headers=["Authorization", "Content-Type", "Accept", "Cache-Control", "Pragma", "Expires"],
)

# Router Registration
app.include_router(auth.router)
app.include_router(diet.router)
app.include_router(workout.router)
app.include_router(fitness_chat.router)
app.include_router(habit.router)
app.include_router(analytics.router)
app.include_router(profile_router.router)
app.include_router(consistency.router)
app.include_router(achievements.router)
app.include_router(gym_finder.router)


@app.get("/")
def root():
    return {"message": "IFA (Intelligent Fitness Assistant) API is running"}
