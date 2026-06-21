# app/services/squat_service.py
"""
==================================================
AI Gym & Fitness Assistant

File: pushup_service.py

Purpose:
Implements AI-powered pushup detection
using MediaPipe pose landmarks.

Functionality:
- Detects pushup movements.
- Calculates elbow angles.
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

from app.services.exercise_utils import calculate_angle


class SquatCounter:

    def __init__(self):

        self.counter = 0

        self.state = "standing"

        self._reached_depth = False

    def process(self, landmarks):

        hip = [landmarks[23].x, landmarks[23].y]

        knee = [landmarks[25].x, landmarks[25].y]

        ankle = [landmarks[27].x, landmarks[27].y]

        angle = calculate_angle(hip, knee, ankle)

        feedback = ""

        if self.state == "standing":

            feedback = "Start Squatting"

            if angle < 155:

                self.state = "descending"

                self._reached_depth = False

        elif self.state == "descending":

            feedback = "Keep Going Down"

            if angle <= 105:

                self.state = "bottom"

                self._reached_depth = True

            elif angle > 158:

                self.state = "standing"

                self._reached_depth = False

        elif self.state == "bottom":

            feedback = "Good Depth! Now Rise"

            if angle > 130:

                self.state = "ascending"

        elif self.state == "ascending":

            feedback = "Almost There, Stand Tall"

            if angle > 160 and self._reached_depth:

                self.counter += 1

                self.state = "standing"

                self._reached_depth = False

                feedback = "Great Squat!"

            elif angle <= 105:

                self.state = "bottom"

        if self.state == "descending" and angle > 130:

            feedback = "Go Lower"

        elif self.state == "descending" and angle <= 130:

            feedback = "Almost There"

        return {
            "angle": int(angle),
            "count": self.counter,
            "state": self.state,
            "feedback": feedback,
        }
