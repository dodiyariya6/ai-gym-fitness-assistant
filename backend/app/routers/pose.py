# app/routers/pose.py
"""
==================================================
AI Gym & Fitness Assistant

File: pose.py

Purpose:
Defines API endpoints for starting AI-powered
pose detection and exercise analysis sessions.

Functionality:
- Starts webcam-based pose detection.
- Initiates exercise tracking sessions.
- Supports multiple exercise types.
- Connects the API with the MediaPipe pose engine.

API Base Route:
/pose

Used By:
Webcam Trainer page
pose_service.py
AI Webcam Trainer
Pose-to-Performance Analyzer

==================================================
"""

import os

from fastapi import APIRouter, HTTPException

from app.services.pose_service import run_pose_detection

router = APIRouter(prefix="/pose", tags=["Pose"])

IS_RENDER = os.getenv("RENDER") == "true"


@router.get("/start")
def start_pose(exercise: str = "squat"):

    if IS_RENDER:

        raise HTTPException(
            status_code=501, detail="Webcam AI Trainer is available only in local mode."
        )

    return run_pose_detection(exercise)
