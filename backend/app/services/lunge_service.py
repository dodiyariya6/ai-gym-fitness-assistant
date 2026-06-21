# app/services/lunge_service.py
"""
==================================================
AI Gym & Fitness Assistant

File: lunge_service.py

Purpose:
Implements AI-powered lunge detection
using MediaPipe pose landmarks.

Functionality:
- Detects lunge movements.
- Calculates knee angles.
- Counts repetitions.
- Tracks exercise states.
- Validates movement depth.
- Generates live form feedback.

Responsibilities:
Pose analysis
Rep counting
Movement validation
Real-time feedback

Used By:
pose_service.py
AI Webcam Trainer
Pose-to-Performance Analyzer

==================================================
"""

import math

import mediapipe as mp


class LungeCounter:

    def __init__(self):

        self.count = 0

        self.stage = None

        self._reached_lunge = False

    def calculate_angle(self, a, b, c):

        radians = math.atan2(c[1] - b[1], c[0] - b[0]) - math.atan2(
            a[1] - b[1], a[0] - b[0]
        )

        angle = abs(radians * 180.0 / math.pi)

        if angle > 180:

            angle = 360 - angle

        return int(angle)

    def process(self, landmarks):

        hip = [
            landmarks[mp.solutions.pose.PoseLandmark.LEFT_HIP.value].x,
            landmarks[mp.solutions.pose.PoseLandmark.LEFT_HIP.value].y,
        ]

        knee = [
            landmarks[mp.solutions.pose.PoseLandmark.LEFT_KNEE.value].x,
            landmarks[mp.solutions.pose.PoseLandmark.LEFT_KNEE.value].y,
        ]

        ankle = [
            landmarks[mp.solutions.pose.PoseLandmark.LEFT_ANKLE.value].x,
            landmarks[mp.solutions.pose.PoseLandmark.LEFT_ANKLE.value].y,
        ]

        angle = self.calculate_angle(hip, knee, ankle)

        feedback = "Get Ready"

        if angle > 155:

            if self.stage != "up":

                if self.stage == "down" and self._reached_lunge:

                    self.count += 1

                    feedback = "Rep Complete!"

                else:

                    feedback = "Step Forward"

            self.stage = "up"

            self._reached_lunge = False

            if feedback not in ("Rep Complete!",):

                feedback = "Step Forward"

        elif angle < 110:

            self.stage = "down"

            self._reached_lunge = True

            feedback = "Good Lunge! Hold It"

        else:

            if self.stage == "up":

                feedback = "Lunge Deeper"

            else:

                feedback = "Rise Back Up"

        return {
            "count": self.count,
            "angle": angle,
            "state": self.stage,
            "feedback": feedback,
        }
