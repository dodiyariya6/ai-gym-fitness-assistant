# app/services/exercise_utils.py
"""
==================================================
AI Gym & Fitness Assistant

File: exercise_utils.py

Purpose:
Provides shared utility functions used by
AI exercise detection modules.

Functionality:
- Calculates joint angles.
- Supports pose analysis calculations.
- Standardizes movement measurements.
- Reuses logic across multiple exercises.

Responsibilities:
Angle calculation
Pose geometry calculations
Shared exercise utilities

Used By:
squat_service.py
curl_service.py
pushup_service.py

==================================================
"""

import math


def calculate_angle(a, b, c):

    ax, ay = a

    bx, by = b

    cx, cy = c

    angle = math.degrees(math.atan2(cy - by, cx - bx) - math.atan2(ay - by, ax - bx))

    angle = abs(angle)

    if angle > 180:

        angle = 360 - angle

    return angle
