# app/services/curl_service.py
"""
==================================================
AI Gym & Fitness Assistant

File: curl_service.py

Purpose:
Implements AI-powered bicep curl detection
using MediaPipe pose landmarks.

Functionality:
- Detects bicep curl movements.
- Calculates elbow angles.
- Counts repetitions.
- Tracks exercise states.
- Filters noisy detections.
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

from app.services.exercise_utils import calculate_angle


class CurlCounter:

    def __init__(self):

        self.counter = 0

        self.state = "down"

        self._frames_up = 0

        self._MIN_FRAMES_UP = 3

    def process(self, landmarks):

        shoulder = [landmarks[11].x, landmarks[11].y]

        elbow = [landmarks[13].x, landmarks[13].y]

        wrist = [landmarks[15].x, landmarks[15].y]

        angle = calculate_angle(shoulder, elbow, wrist)

        feedback = ""

        if self.state == "down":

            if angle < 65:

                self.state = "up"

                self._frames_up = 0

        elif self.state == "up":

            self._frames_up += 1

            if angle > 140 and self._frames_up >= self._MIN_FRAMES_UP:

                self.counter += 1

                self.state = "down"

                self._frames_up = 0

        if self.state == "down":

            if angle < 140:

                feedback = "Extend Fully"

            else:

                feedback = "Ready — Curl Up"

        elif self.state == "up":

            if angle > 65:

                feedback = "Curl Higher"

            else:

                feedback = "Good Form! Lower Slowly"

        return {
            "angle": int(angle),
            "count": self.counter,
            "state": self.state,
            "feedback": feedback,
        }
