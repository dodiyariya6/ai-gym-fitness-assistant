# app/services/jumping_jack_service.py
"""
==================================================
AI Gym & Fitness Assistant

File: jumping_jack_service.py

Purpose:
Implements AI-powered jumping jack detection
using MediaPipe pose landmarks.

Functionality:
- Detects jumping jack movements.
- Counts repetitions.
- Tracks exercise states.
- Validates full-body movements.
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

from math import sqrt


class JumpingJackCounter:

    def __init__(self):

        self.counter = 0

        self.state = "closed"

        self._frames_open = 0

        self._MIN_FRAMES_OPEN = 4

        self._confirmed_open = False

    def process(self, landmarks):
        left_shoulder = landmarks[11]
        right_shoulder = landmarks[12]
        left_wrist = landmarks[15]
        right_wrist = landmarks[16]
        left_hip = landmarks[23]
        right_hip = landmarks[24]
        left_ankle = landmarks[27]
        right_ankle = landmarks[28]

        hip_width = abs(left_hip.x - right_hip.x)

        ankle_spread = abs(left_ankle.x - right_ankle.x)

        left_arm_raised = left_wrist.y < left_shoulder.y - 0.04
        right_arm_raised = right_wrist.y < right_shoulder.y - 0.04

        arms_up = left_arm_raised and right_arm_raised

        left_arm_down = left_wrist.y > left_shoulder.y + 0.04
        right_arm_down = right_wrist.y > right_shoulder.y + 0.04

        arms_down = left_arm_down and right_arm_down

        legs_open = ankle_spread > hip_width * 1.1

        legs_closed = ankle_spread < hip_width * 0.85

        is_open = arms_up and legs_open
        is_closed = arms_down and legs_closed

        feedback = ""

        if self.state == "closed":

            if is_open:

                self._frames_open += 1

                if self._frames_open >= self._MIN_FRAMES_OPEN:

                    self.state = "open"

                    self._confirmed_open = True

                    self._frames_open = 0

            else:

                self._frames_open = 0

        elif self.state == "open":

            if is_closed and self._confirmed_open:

                self.counter += 1

                self.state = "closed"

                self._confirmed_open = False

            elif not is_open:

                # Still transitioning — stay in open, wait for closed
                pass

        if self.state == "closed":

            if not arms_up and not legs_open:

                feedback = "Jump & Spread Arms!"

            elif arms_up and not legs_open:

                feedback = "Spread Your Legs Too"

            elif not arms_up and legs_open:

                feedback = "Raise Your Arms Too"

            else:

                feedback = "Hold Open Position"

        elif self.state == "open":

            feedback = "Good! Now Close"

        return {
            "angle": 0,
            "count": self.counter,
            "state": self.state,
            "feedback": feedback,
        }
