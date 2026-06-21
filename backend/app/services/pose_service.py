# app/services/pose_service.py
"""
==================================================
AI Gym & Fitness Assistant

File: pose_service.py

Purpose:
Controls the AI webcam trainer by running
MediaPipe pose detection and exercise analysis.

Functionality:
- Starts webcam sessions.
- Detects body poses.
- Supports multiple exercises.
- Calculates form scores.
- Counts repetitions.
- Generates live feedback.
- Calculates session duration.
- Returns workout summaries.

Responsibilities:
Webcam control
Pose detection
Exercise selection
Form scoring
Workout summarization

Used By:
pose.py router
Webcam page
AI Webcam Trainer
Pose-to-Performance Analyzer

==================================================
"""

import cv2
import mediapipe as mp
import time

from app.services.squat_service import SquatCounter
from app.services.curl_service import CurlCounter
from app.services.pushup_service import PushupCounter
from app.services.lunge_service import LungeCounter
from app.services.jumping_jack_service import JumpingJackCounter


def calculate_form_score(exercise, data):

    score = 100

    angle = data.get("angle", 0)

    if exercise == "squat":

        if angle < 70:

            score -= 15

        elif angle > 130:

            score -= 10

    elif exercise == "pushup":

        if angle > 160:

            score -= 15

    elif exercise == "lunge":

        if angle < 70:

            score -= 15

    elif exercise == "curl":

        if angle < 50:

            score -= 10

    elif exercise == "jumpingjack":

        if angle < 130:

            score -= 10

    return max(50, min(100, score))


def run_pose_detection(exercise="squat"):

    mp_pose = mp.solutions.pose

    mp_drawing = mp.solutions.drawing_utils

    cap = cv2.VideoCapture(0)

    start_time = time.time()

    if exercise == "squat":

        counter = SquatCounter()

        exercise_name = "Squats"

    elif exercise == "curl":

        counter = CurlCounter()

        exercise_name = "Bicep Curls"

    elif exercise == "pushup":

        counter = PushupCounter()

        exercise_name = "Pushups"

    elif exercise == "lunge":

        counter = LungeCounter()

        exercise_name = "Lunges"

    elif exercise == "jumpingjack":

        counter = JumpingJackCounter()

        exercise_name = "Jumping Jacks"

    else:

        return {"message": f"{exercise} not implemented yet"}

    data = {"count": 0, "angle": 0, "state": "", "feedback": ""}

    with mp_pose.Pose(
        min_detection_confidence=0.5, min_tracking_confidence=0.5
    ) as pose:

        while cap.isOpened():

            success, frame = cap.read()

            if not success:

                break

            image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            image.flags.writeable = False

            results = pose.process(image)

            image.flags.writeable = True

            image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

            if results.pose_landmarks:

                data = counter.process(results.pose_landmarks.landmark)

                mp_drawing.draw_landmarks(
                    image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS
                )

                cv2.putText(
                    image,
                    f"{exercise_name}: {data['count']}",
                    (50, 50),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1,
                    (0, 255, 0),
                    2,
                )

                cv2.putText(
                    image,
                    f"Angle: {data['angle']}",
                    (50, 100),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1,
                    (255, 255, 0),
                    2,
                )

                cv2.putText(
                    image,
                    f"State: {data['state']}",
                    (50, 150),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1,
                    (0, 255, 255),
                    2,
                )

                cv2.putText(
                    image,
                    data["feedback"],
                    (50, 200),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1,
                    (0, 255, 0),
                    2,
                )

            cv2.imshow("AI Gym Trainer", image)

            if cv2.waitKey(1) & 0xFF == ord("q"):

                break

    cap.release()

    cv2.destroyAllWindows()

    duration_seconds = int(time.time() - start_time)

    if duration_seconds < 60:

        duration_str = f"{duration_seconds} sec"

    else:

        duration_minutes = round(duration_seconds / 60)

        duration_str = f"{duration_minutes} min"

    reps = data["count"]

    form_score = calculate_form_score(exercise, data)

    print("POSE OUTPUT:", duration_str, reps, form_score)

    return {
        "exercise_name": exercise_name,
        "reps": reps,
        "duration": duration_str,
        "calories_burned": reps * 5,
        "form_score": form_score,
    }
