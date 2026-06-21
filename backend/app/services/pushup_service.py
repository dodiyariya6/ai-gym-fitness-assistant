# app/services/pushup_service.py
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


class PushupCounter:

    def __init__(self):

        self.counter = 0

        self.state = "up"

        self._reached_bottom = False

        self._frames_extended = 0

        self._MIN_FRAMES_EXTENDED = 3

    def process(self, landmarks):

        shoulder = [landmarks[11].x, landmarks[11].y]

        elbow = [landmarks[13].x, landmarks[13].y]

        wrist = [landmarks[15].x, landmarks[15].y]

        angle = calculate_angle(shoulder, elbow, wrist)

        feedback = ""

        if self.state == "up":

            self._frames_extended = 0

            feedback = "Lower Your Body"

            if angle < 95:

                self.state = "down"

                self._reached_bottom = True

        elif self.state == "down":

            self._frames_extended = 0

            if angle >= 155:

                self.state = "extending"

        elif self.state == "extending":

            if angle >= 155:

                self._frames_extended += 1

                if (
                    self._frames_extended >= self._MIN_FRAMES_EXTENDED
                    and self._reached_bottom
                ):

                    self.counter += 1

                    self.state = "up"

                    self._reached_bottom = False

                    self._frames_extended = 0

            else:

                self.state = "down"

                self._frames_extended = 0

        if self.state == "up" or self.state == "extending":

            if angle >= 155:

                feedback = "Great Extension!"

            else:

                feedback = "Extend Arms Fully"

        elif self.state == "down":

            if angle > 95:

                feedback = "Go Lower"

            else:

                feedback = "Good Depth! Push Up"

        return {
            "angle": int(angle),
            "count": self.counter,
            "state": self.state,
            "feedback": feedback,
        }
