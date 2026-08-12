// src/utils/exerciseCounters.js
/*
==================================================
IFA — Intelligent Fitness Assistant

File: exerciseCounters.js

Purpose:
Client-side port of the rep-counting/form-scoring
state machines that used to run server-side.

Why this exists:
The AI Webcam Trainer originally ran entirely on the backend —
cv2.VideoCapture(0) grabbed frames from whatever machine ran the FastAPI
process, and MediaPipe/OpenCV analysed them there. That only ever worked
for the developer's own laptop: a deployed backend (Render) has no camera
and no display, so it could never work for a real visitor. This module
is a line-for-line port of the same five per-exercise state machines
(previously backend/app/services/{squat,curl,pushup,lunge,jumping_jack}
_service.py) so the exact same thresholds/feedback run in the browser
against the visitor's own camera instead. See Webcam.jsx for the
getUserMedia + MediaPipe Tasks Vision capture loop that feeds these.

Landmark indices below match MediaPipe's standard 33-point BlazePose
topology (same in the legacy Python `mediapipe.solutions.pose` API and
the current browser `@mediapipe/tasks-vision` PoseLandmarker) — the same
indices the original Python services used.
==================================================
*/

// Same three-point angle formula as exercise_utils.calculate_angle() /
// LungeCounter.calculate_angle() (both Python versions were identical).
export function calculateAngle(a, b, c) {
  const [ax, ay] = a;
  const [bx, by] = b;
  const [cx, cy] = c;
  let angle =
    (Math.atan2(cy - by, cx - bx) - Math.atan2(ay - by, ax - bx)) *
    (180 / Math.PI);
  angle = Math.abs(angle);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

export class SquatCounter {
  constructor() {
    this.counter = 0;
    this.state = "standing";
    this._reachedDepth = false;
  }

  process(lm) {
    const hip = [lm[23].x, lm[23].y];
    const knee = [lm[25].x, lm[25].y];
    const ankle = [lm[27].x, lm[27].y];
    const angle = calculateAngle(hip, knee, ankle);
    let feedback = "";

    if (this.state === "standing") {
      feedback = "Start Squatting";
      if (angle < 155) {
        this.state = "descending";
        this._reachedDepth = false;
      }
    } else if (this.state === "descending") {
      feedback = "Keep Going Down";
      if (angle <= 105) {
        this.state = "bottom";
        this._reachedDepth = true;
      } else if (angle > 158) {
        this.state = "standing";
        this._reachedDepth = false;
      }
    } else if (this.state === "bottom") {
      feedback = "Good Depth! Now Rise";
      if (angle > 130) this.state = "ascending";
    } else if (this.state === "ascending") {
      feedback = "Almost There, Stand Tall";
      if (angle > 160 && this._reachedDepth) {
        this.counter += 1;
        this.state = "standing";
        this._reachedDepth = false;
        feedback = "Great Squat!";
      } else if (angle <= 105) {
        this.state = "bottom";
      }
    }

    if (this.state === "descending" && angle > 130) feedback = "Go Lower";
    else if (this.state === "descending" && angle <= 130)
      feedback = "Almost There";

    return { angle: Math.trunc(angle), count: this.counter, state: this.state, feedback };
  }
}

export class CurlCounter {
  constructor() {
    this.counter = 0;
    this.state = "down";
    this._framesUp = 0;
    this._MIN_FRAMES_UP = 3;
  }

  process(lm) {
    const shoulder = [lm[11].x, lm[11].y];
    const elbow = [lm[13].x, lm[13].y];
    const wrist = [lm[15].x, lm[15].y];
    const angle = calculateAngle(shoulder, elbow, wrist);
    let feedback = "";

    if (this.state === "down") {
      if (angle < 65) {
        this.state = "up";
        this._framesUp = 0;
      }
    } else if (this.state === "up") {
      this._framesUp += 1;
      if (angle > 140 && this._framesUp >= this._MIN_FRAMES_UP) {
        this.counter += 1;
        this.state = "down";
        this._framesUp = 0;
      }
    }

    if (this.state === "down") {
      feedback = angle < 140 ? "Extend Fully" : "Ready — Curl Up";
    } else if (this.state === "up") {
      feedback = angle > 65 ? "Curl Higher" : "Good Form! Lower Slowly";
    }

    return { angle: Math.trunc(angle), count: this.counter, state: this.state, feedback };
  }
}

export class PushupCounter {
  constructor() {
    this.counter = 0;
    this.state = "up";
    this._reachedBottom = false;
    this._framesExtended = 0;
    this._MIN_FRAMES_EXTENDED = 3;
  }

  process(lm) {
    const shoulder = [lm[11].x, lm[11].y];
    const elbow = [lm[13].x, lm[13].y];
    const wrist = [lm[15].x, lm[15].y];
    const angle = calculateAngle(shoulder, elbow, wrist);
    let feedback = "";

    if (this.state === "up") {
      this._framesExtended = 0;
      feedback = "Lower Your Body";
      if (angle < 95) {
        this.state = "down";
        this._reachedBottom = true;
      }
    } else if (this.state === "down") {
      this._framesExtended = 0;
      if (angle >= 155) this.state = "extending";
    } else if (this.state === "extending") {
      if (angle >= 155) {
        this._framesExtended += 1;
        if (this._framesExtended >= this._MIN_FRAMES_EXTENDED && this._reachedBottom) {
          this.counter += 1;
          this.state = "up";
          this._reachedBottom = false;
          this._framesExtended = 0;
        }
      } else {
        this.state = "down";
        this._framesExtended = 0;
      }
    }

    if (this.state === "up" || this.state === "extending") {
      feedback = angle >= 155 ? "Great Extension!" : "Extend Arms Fully";
    } else if (this.state === "down") {
      feedback = angle > 95 ? "Go Lower" : "Good Depth! Push Up";
    }

    return { angle: Math.trunc(angle), count: this.counter, state: this.state, feedback };
  }
}

export class LungeCounter {
  constructor() {
    this.count = 0;
    this.stage = null;
    this._reachedLunge = false;
  }

  process(lm) {
    // Left-side landmarks only, same as the original Python service.
    // Truncated to an int before comparison (not just for display) — the
    // original LungeCounter.calculate_angle() did the same, unlike the
    // other four counters which compare on the raw float.
    const hip = [lm[23].x, lm[23].y];
    const knee = [lm[25].x, lm[25].y];
    const ankle = [lm[27].x, lm[27].y];
    const angle = Math.trunc(calculateAngle(hip, knee, ankle));
    let feedback = "Get Ready";

    if (angle > 155) {
      if (this.stage !== "up") {
        feedback =
          this.stage === "down" && this._reachedLunge ? "Rep Complete!" : "Step Forward";
        if (feedback === "Rep Complete!") this.count += 1;
      }
      this.stage = "up";
      this._reachedLunge = false;
      if (feedback !== "Rep Complete!") feedback = "Step Forward";
    } else if (angle < 110) {
      this.stage = "down";
      this._reachedLunge = true;
      feedback = "Good Lunge! Hold It";
    } else {
      feedback = this.stage === "up" ? "Lunge Deeper" : "Rise Back Up";
    }

    return { count: this.count, angle, state: this.stage, feedback };
  }
}

export class JumpingJackCounter {
  constructor() {
    this.counter = 0;
    this.state = "closed";
    this._framesOpen = 0;
    this._MIN_FRAMES_OPEN = 4;
    this._confirmedOpen = false;
  }

  process(lm) {
    const leftShoulder = lm[11];
    const rightShoulder = lm[12];
    const leftWrist = lm[15];
    const rightWrist = lm[16];
    const leftHip = lm[23];
    const rightHip = lm[24];
    const leftAnkle = lm[27];
    const rightAnkle = lm[28];

    const hipWidth = Math.abs(leftHip.x - rightHip.x);
    const ankleSpread = Math.abs(leftAnkle.x - rightAnkle.x);

    const armsUp =
      leftWrist.y < leftShoulder.y - 0.04 && rightWrist.y < rightShoulder.y - 0.04;
    const armsDown =
      leftWrist.y > leftShoulder.y + 0.04 && rightWrist.y > rightShoulder.y + 0.04;

    const legsOpen = ankleSpread > hipWidth * 1.1;
    const legsClosed = ankleSpread < hipWidth * 0.85;

    const isOpen = armsUp && legsOpen;
    const isClosed = armsDown && legsClosed;

    let feedback = "";

    if (this.state === "closed") {
      if (isOpen) {
        this._framesOpen += 1;
        if (this._framesOpen >= this._MIN_FRAMES_OPEN) {
          this.state = "open";
          this._confirmedOpen = true;
          this._framesOpen = 0;
        }
      } else {
        this._framesOpen = 0;
      }
    } else if (this.state === "open") {
      if (isClosed && this._confirmedOpen) {
        this.counter += 1;
        this.state = "closed";
        this._confirmedOpen = false;
      }
      // else: still transitioning — stay open, wait for closed.
    }

    if (this.state === "closed") {
      if (!armsUp && !legsOpen) feedback = "Jump & Spread Arms!";
      else if (armsUp && !legsOpen) feedback = "Spread Your Legs Too";
      else if (!armsUp && legsOpen) feedback = "Raise Your Arms Too";
      else feedback = "Hold Open Position";
    } else if (this.state === "open") {
      feedback = "Good! Now Close";
    }

    return { angle: 0, count: this.counter, state: this.state, feedback };
  }
}

export const EXERCISE_COUNTERS = {
  squat: { Counter: SquatCounter, exerciseName: "Squats" },
  curl: { Counter: CurlCounter, exerciseName: "Bicep Curls" },
  pushup: { Counter: PushupCounter, exerciseName: "Pushups" },
  lunge: { Counter: LungeCounter, exerciseName: "Lunges" },
  jumpingjack: { Counter: JumpingJackCounter, exerciseName: "Jumping Jacks" },
};

// Same thresholds as pose_service.calculate_form_score() — kept separate
// per exercise so a shallow squat/lunge or a not-quite-locked-out pushup
// still counts as a rep but scores lower, instead of an all-or-nothing pass/fail.
export function calculateFormScore(exercise, data) {
  let score = 100;
  const angle = data.angle ?? 0;

  if (exercise === "squat") {
    if (angle < 70) score -= 15;
    else if (angle > 130) score -= 10;
  } else if (exercise === "pushup") {
    if (angle > 160) score -= 15;
  } else if (exercise === "lunge") {
    if (angle < 70) score -= 15;
  } else if (exercise === "curl") {
    if (angle < 50) score -= 10;
  } else if (exercise === "jumpingjack") {
    if (angle < 130) score -= 10;
  }

  return Math.max(50, Math.min(100, score));
}

// Same MET table/formula as calorie_service.estimate_calories() — kept in
// sync so calories_burned means the same thing regardless of whether a
// workout was logged manually or via the webcam trainer.
const MET_TABLE = {
  squat: 5.0,
  "bench press": 3.8,
  deadlift: 6.0,
  "pull up": 8.0,
  "push up": 3.8,
  pushup: 3.8,
  lunge: 4.0,
  curl: 3.0,
  "bicep curl": 3.0,
  "shoulder press": 4.0,
  row: 4.5,
  plank: 3.0,
  "jumping jack": 8.0,
  run: 9.0,
  running: 9.0,
  cycling: 7.5,
  default: 4.0,
};

const DEFAULT_BODY_WEIGHT_KG = 70.0;

export function estimateCalories(exerciseName, durationSeconds, bodyWeight) {
  if (!durationSeconds || durationSeconds <= 0) return 0;

  const durationMinutes = durationSeconds / 60;
  const nameLower = (exerciseName || "").toLowerCase();

  let met = MET_TABLE.default;
  for (const [key, metValue] of Object.entries(MET_TABLE)) {
    if (nameLower.includes(key)) {
      met = metValue;
      break;
    }
  }

  const weight = bodyWeight && bodyWeight > 0 ? bodyWeight : DEFAULT_BODY_WEIGHT_KG;
  const calories = (met * 3.5 * weight * durationMinutes) / 200;

  return Math.max(1, Math.round(calories));
}

// Matches pose_service.run_pose_detection()'s "Xsec"/"Xmin" formatting so
// duration displays identically to the old server-generated summaries.
export function formatDuration(durationSeconds) {
  if (durationSeconds < 60) return `${Math.trunc(durationSeconds)} sec`;
  return `${Math.round(durationSeconds / 60)} min`;
}
