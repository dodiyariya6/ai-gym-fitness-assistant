// src/pages/Webcam.jsx
/*
==================================================
IFA — Intelligent Fitness Assistant

File: Webcam.jsx

Purpose:
Provides an AI-powered webcam trainer
for real-time exercise analysis.

Functionality:
- Requests the visitor's own camera via getUserMedia.
- Runs MediaPipe pose detection entirely in the browser.
- Supports exercise selection.
- Tracks repetitions.
- Tracks workout duration.
- Calculates calories burned.
- Evaluates form scores.
- Displays session summaries.
- Saves completed workouts.
- Supports responsive layouts.

Architecture note (why this file looks the way it does):
This used to call GET /pose/start and the BACKEND opened a camera with
cv2.VideoCapture(0) — meaning it only ever worked against whichever
machine ran the FastAPI process. A deployed backend (Render) has no
camera or display, so that endpoint was hard-disabled in production. Pose
detection now runs client-side (getUserMedia + MediaPipe Tasks Vision),
using every visitor's own camera. The rep-counting/form-scoring logic is
an intentional line-for-line port of the old backend services — see
utils/exerciseCounters.js — so behavior is unchanged, only where it runs.
Workout persistence is untouched: the finished session still goes through
the same saveWorkout()/POST /workout/save contract used everywhere else.

Responsibilities:
Live workout tracking
Form analysis
Session management
Workout persistence

Used By:
Webcam page

==================================================
*/
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FilesetResolver, PoseLandmarker, DrawingUtils } from "@mediapipe/tasks-vision";
import {
  Dumbbell,
  Play,
  Square,
  CheckCircle2,
  XCircle,
  Activity,
  Flame,
  Clock,
  Target,
  Award,
  Sparkles,
  TrendingUp,
  RotateCcw,
  VideoOff,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout";
import { saveWorkout } from "../services/workoutService";
import { getProfile } from "../services/profileService";
import { useToast } from "../context/ToastContext";
import {
  EXERCISE_COUNTERS,
  calculateFormScore,
  estimateCalories,
  formatDuration,
} from "../utils/exerciseCounters";
import "../styles/webcam.css";

/* ── Animation Variants ─────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, delay: i * 0.07, ease: "easeOut" },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: (i = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, delay: i * 0.06, ease: "easeOut" },
  }),
};

/* ── Exercise meta (display only — real logic lives in EXERCISE_COUNTERS) */
const EXERCISES = [
  { value: "squat", label: "Squats", icon: Dumbbell },
  { value: "curl", label: "Bicep Curls", icon: Activity },
  { value: "pushup", label: "Pushups", icon: Target },
  { value: "lunge", label: "Lunges", icon: TrendingUp },
  { value: "jumpingjack", label: "Jumping Jacks", icon: Flame },
];

// The .task model is fetched once from Google's public model CDN — this is
// a client-side (visitor's browser) network request, unrelated to and
// unaffected by anything the backend does. Cached at module scope so
// switching exercises or starting a second session in the same browser
// tab reuses the already-loaded detector instead of re-downloading it.
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
let landmarkerPromise = null;
function getPoseLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = FilesetResolver.forVisionTasks(WASM_URL).then((vision) =>
      PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
        numPoses: 1,
      }),
    );
  }
  return landmarkerPromise;
}

// Maps getUserMedia's DOMException.name to the specific, actionable message
// each denial/failure mode actually needs (section 9 of the production
// hardening pass) — a single generic "camera error" isn't enough to tell a
// user whether to change a browser setting, close another app, or give up.
function describeCameraError(err) {
  const name = err?.name;
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Camera access was denied. Allow camera permission for this site in your browser settings, then try again.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No camera was found on this device. Connect a camera and try again.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Your camera is already in use by another app or browser tab. Close it and try again.";
  }
  if (name === "OverconstrainedError") {
    return "No camera on this device matches the required settings.";
  }
  if (name === "SecurityError") {
    return "Camera access requires a secure (HTTPS) connection.";
  }
  return "Unable to access your camera. Please check your permissions and try again.";
}

/* ── Performance insight derivation ────────────── */
function getPerformanceInsight(workout) {
  const score = workout.form_score ?? 0;
  if (score >= 90)
    return { label: "Excellent Form", cls: "insight-excellent", icon: Award };
  if (score >= 75)
    return { label: "Good Progress", cls: "insight-good", icon: TrendingUp };
  if (score >= 55)
    return { label: "Keep Going", cls: "insight-neutral", icon: Sparkles };
  return { label: "Needs Improvement", cls: "insight-warning", icon: Target };
}

/* ── Summary metric card ────────────────────────── */
function SummaryCard({ icon: Icon, label, value, color, index }) {
  return (
    <motion.div
      className="summary-card"
      variants={scaleIn}
      custom={index}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -3, boxShadow: "0 14px 36px rgba(0,0,0,0.10)" }}
    >
      <div className="summary-card-icon" style={{ background: `${color}15` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <span className="summary-card-value">{value}</span>
      <span className="summary-card-label">{label}</span>
    </motion.div>
  );
}

const CAMERA_SUPPORTED =
  typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

/* ── Main Component ─────────────────────────────── */
export default function Webcam() {
  const { toast } = useToast();

  const [exercise, setExercise] = useState("squat");
  const [phase, setPhase] = useState("launcher"); // launcher | requesting | live | error
  const [cameraError, setCameraError] = useState("");
  const [liveStats, setLiveStats] = useState({ count: 0, feedback: "" });
  const [pendingWorkout, setPendingWorkout] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const counterRef = useRef(null);
  const startTimeRef = useRef(0);
  const lastDataRef = useRef({ count: 0, angle: 0, state: "", feedback: "" });
  const liveStatsRef = useRef(liveStats); // avoids re-subscribing the rAF loop to state changes
  const drawingUtilsRef = useRef(null);
  const errorStreakRef = useRef(0);
  const landmarkerRef = useRef(null);
  const bodyWeightRef = useRef(null);

  useEffect(() => {
    liveStatsRef.current = liveStats;
  }, [liveStats]);

  // Same body-weight lookup the old server-side flow did (pose.py read
  // Profile.weight) — kept so calories_burned means the same thing
  // whether logged manually, via the old flow, or via this one. Best
  // effort only: a profile-less user still gets a session, just using
  // estimateCalories()'s DEFAULT_BODY_WEIGHT_KG fallback.
  useEffect(() => {
    getProfile()
      .then((profile) => {
        bodyWeightRef.current = profile?.weight || null;
      })
      .catch(() => {
        bodyWeightRef.current = null;
      });
  }, []);

  // Stops every media track and the detection loop — called on Stop, on
  // discard, and on unmount/navigate-away so the camera never keeps
  // running once the user isn't looking at this page.
  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // Camera must stop even if the user navigates away mid-session rather
  // than clicking Stop — React Router unmounts this component on route
  // change, so cleanup here is the only guarantee.
  useEffect(() => stopCamera, [stopCamera]);

  // Held in a ref (rather than calling the useCallback binding recursively)
  // so the rAF loop schedules its next tick through detectionLoopRef.current
  // instead of closing over its own not-yet-assigned declaration.
  const detectionLoopRef = useRef(null);

  const detectionLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !canvas || !landmarker || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(() => detectionLoopRef.current());
      return;
    }

    if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
    if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!drawingUtilsRef.current) drawingUtilsRef.current = new DrawingUtils(ctx);

    try {
      const result = landmarker.detectForVideo(video, performance.now());
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const landmarks = result.landmarks?.[0];
      if (landmarks) {
        drawingUtilsRef.current.drawLandmarks(landmarks, {
          radius: 3,
          color: "#8B5CF6",
        });
        drawingUtilsRef.current.drawConnectors(
          landmarks,
          PoseLandmarker.POSE_CONNECTIONS,
          { color: "#6366F1", lineWidth: 3 },
        );

        const data = counterRef.current.process(landmarks);
        lastDataRef.current = data;
        errorStreakRef.current = 0;

        const prev = liveStatsRef.current;
        if (data.count !== prev.count || data.feedback !== prev.feedback) {
          setLiveStats({ count: data.count, feedback: data.feedback });
        }
      }
      ctx.restore();
    } catch {
      // A handful of individual bad frames (e.g. momentary decode hiccup)
      // is normal and should not interrupt the session — only surface an
      // error if detection fails persistently.
      errorStreakRef.current += 1;
      if (errorStreakRef.current > 90) {
        setCameraError(
          "Pose detection stopped unexpectedly. Please stop and restart the session.",
        );
        setPhase("error");
        stopCamera();
        return;
      }
    }

    rafRef.current = requestAnimationFrame(() => detectionLoopRef.current());
  }, [stopCamera]);

  useEffect(() => {
    detectionLoopRef.current = detectionLoop;
  }, [detectionLoop]);

  const startSession = async () => {
    if (!CAMERA_SUPPORTED) {
      setCameraError(
        "Your browser doesn't support camera access. Try a recent version of Chrome, Edge, Firefox, or Safari.",
      );
      setPhase("error");
      return;
    }
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      setCameraError("Camera access requires a secure (HTTPS) connection.");
      setPhase("error");
      return;
    }

    setPhase("requesting");
    setCameraError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();

      landmarkerRef.current = await getPoseLandmarker();

      const { Counter } = EXERCISE_COUNTERS[exercise];
      counterRef.current = new Counter();
      lastDataRef.current = { count: 0, angle: 0, state: "", feedback: "" };
      errorStreakRef.current = 0;
      setLiveStats({ count: 0, feedback: "Get ready…" });
      startTimeRef.current = performance.now();

      setPhase("live");
      rafRef.current = requestAnimationFrame(detectionLoop);
    } catch (error) {
      console.error("Webcam Session Error:", error);
      stopCamera();
      setCameraError(describeCameraError(error));
      setPhase("error");
    }
  };

  const endSession = () => {
    const durationSeconds = (performance.now() - startTimeRef.current) / 1000;
    stopCamera();

    const data = lastDataRef.current;
    const { exerciseName } = EXERCISE_COUNTERS[exercise];
    const formScore = calculateFormScore(exercise, data);
    const durationStr = formatDuration(durationSeconds);
    const caloriesBurned = estimateCalories(
      exerciseName,
      durationSeconds,
      bodyWeightRef.current,
    );

    const today = new Date().toISOString().split("T")[0];
    setPendingWorkout({
      exercise_name: exerciseName,
      sets: 1,
      reps: data.count,
      duration: durationStr,
      calories_burned: caloriesBurned,
      form_score: formScore,
      notes: "AI Webcam Session",
      workout_date: today,
    });
    setPhase("launcher");
  };

  const handleSave = async () => {
    try {
      await saveWorkout(pendingWorkout);
      toast.success("Workout saved successfully.");
      setPendingWorkout(null);
    } catch (error) {
      console.error("Workout Save Error:", error);
      toast.error("Unable to save workout.");
    }
  };

  const handleDiscard = () => setPendingWorkout(null);

  const retryFromError = () => {
    setCameraError("");
    setPhase("launcher");
  };

  /* ── derived ── */
  const activeExercise = EXERCISES.find((e) => e.value === exercise);
  const isLive = phase === "live";
  const isRequesting = phase === "requesting";

  return (
    <DashboardLayout>
      <div className="webcam-page">
        {/* ── HERO ── */}
        <motion.section
          className="webcam-hero"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <div className="webcam-hero-blob webcam-hero-blob-1" />
          <div className="webcam-hero-blob webcam-hero-blob-2" />

          <div className="webcam-hero-content">
            <div className="webcam-hero-text">
              <motion.div
                className="webcam-eyebrow"
                variants={fadeUp}
                custom={0}
                initial="hidden"
                animate="visible"
              >
                <Activity size={13} />
                AI Personal Trainer
              </motion.div>

              <motion.h1
                className="webcam-hero-title"
                variants={fadeUp}
                custom={1}
                initial="hidden"
                animate="visible"
              >
                Real-Time
                <span className="webcam-title-accent"> AI Guidance</span>
              </motion.h1>

              <motion.p
                className="webcam-hero-subtitle"
                variants={fadeUp}
                custom={2}
                initial="hidden"
                animate="visible"
              >
                Your form is analysed live, rep by rep, using your own
                camera. Choose an exercise and let your AI trainer take
                over.
              </motion.p>

              <motion.div
                className="webcam-pills"
                variants={fadeUp}
                custom={3}
                initial="hidden"
                animate="visible"
              >
                <span className="webcam-pill pill-indigo">
                  <Dumbbell size={11} /> 5 Exercises
                </span>
                <span className="webcam-pill pill-cyan">
                  <Activity size={11} /> Live Form Scoring
                </span>
                <span className="webcam-pill pill-violet">
                  <ShieldCheck size={11} /> Runs In Your Browser
                </span>
              </motion.div>
            </div>
          </div>
        </motion.section>

        <AnimatePresence mode="wait">
          {/* ── LAUNCHER ── */}
          {phase === "launcher" && !pendingWorkout && (
            <motion.div
              key="launcher"
              className="webcam-main-card"
              variants={fadeUp}
              custom={1}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -12, transition: { duration: 0.22 } }}
            >
              <div className="webcam-section-header">
                <h2 className="webcam-section-title">Select Exercise</h2>
                <p className="webcam-section-sub">
                  Pick the movement you want to train today
                </p>
              </div>

              <div className="exercise-grid">
                {EXERCISES.map((ex) => {
                  const Icon = ex.icon;
                  const active = exercise === ex.value;
                  return (
                    <motion.button
                      key={ex.value}
                      type="button"
                      className={`exercise-tile ${active ? "exercise-tile-active" : ""}`}
                      onClick={() => setExercise(ex.value)}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <div
                        className={`exercise-tile-icon ${active ? "exercise-tile-icon-active" : ""}`}
                      >
                        <Icon size={18} />
                      </div>
                      <span className="exercise-tile-label">{ex.label}</span>
                    </motion.button>
                  );
                })}
              </div>

              <div className="webcam-instructions">
                <div className="instructions-header">
                  <Sparkles size={14} className="instructions-icon" />
                  <span>How it works</span>
                </div>
                <ul
                  className="instructions-list"
                  role="list"
                  aria-label="Webcam instructions"
                >
                  <li>
                    Position yourself so your full body is visible to the
                    camera.
                  </li>
                  <li>Keep good lighting for accurate pose detection.</li>
                  <li>Perform your reps at a controlled, steady pace.</li>
                  <li>
                    Click <strong>Stop Session</strong> when you're done —
                    your video is processed on your device and is never
                    uploaded or recorded.
                  </li>
                </ul>
              </div>

              {!CAMERA_SUPPORTED && (
                <p className="webcam-tip webcam-tip-warning">
                  <AlertTriangle size={13} />
                  This browser doesn't support camera access — try Chrome,
                  Edge, Firefox, or Safari.
                </p>
              )}

              <motion.button
                type="button"
                className="launch-btn"
                onClick={startSession}
                disabled={!CAMERA_SUPPORTED}
                whileHover={
                  CAMERA_SUPPORTED
                    ? { y: -2, boxShadow: "0 12px 32px rgba(99,102,241,0.30)" }
                    : {}
                }
                whileTap={CAMERA_SUPPORTED ? { scale: 0.98 } : {}}
              >
                <Play size={16} fill="currentColor" />
                Start Session — {activeExercise?.label}
              </motion.button>
            </motion.div>
          )}

          {/* ── REQUESTING CAMERA / LIVE SESSION ── */}
          {(isRequesting || isLive) && (
            <motion.div
              key="live"
              className="webcam-main-card webcam-live-card"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="live-video-wrap">
                <video
                  ref={videoRef}
                  className="live-video"
                  muted
                  playsInline
                  autoPlay
                />
                <canvas ref={canvasRef} className="live-canvas" />

                {isRequesting && (
                  <div className="live-overlay-loading">
                    <div className="launch-spinner" />
                    <span>Requesting camera access…</span>
                  </div>
                )}

                {isLive && (
                  <div className="live-hud">
                    <span className="live-hud-count">{liveStats.count}</span>
                    <span className="live-hud-label">
                      {activeExercise?.label} reps
                    </span>
                    {liveStats.feedback && (
                      <span className="live-hud-feedback">
                        {liveStats.feedback}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {isLive && (
                <motion.button
                  type="button"
                  className="stop-btn"
                  onClick={endSession}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Square size={15} fill="currentColor" />
                  Stop Session
                </motion.button>
              )}
            </motion.div>
          )}

          {/* ── CAMERA ERROR ── */}
          {phase === "error" && (
            <motion.div
              key="error"
              className="webcam-main-card webcam-error-card"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="webcam-error-icon">
                <VideoOff size={26} />
              </div>
              <h2 className="webcam-section-title">Camera Unavailable</h2>
              <p className="webcam-error-message">{cameraError}</p>
              <button type="button" className="launch-btn" onClick={retryFromError}>
                Try Again
              </button>
            </motion.div>
          )}

          {/* ── SESSION COMPLETE ── */}
          {pendingWorkout && (
            <motion.div
              key="completion"
              className="completion-wrap"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Completion hero */}
              <motion.div
                className="completion-hero"
                variants={fadeUp}
                initial="hidden"
                animate="visible"
              >
                <div className="completion-blob completion-blob-1" />
                <div className="completion-blob completion-blob-2" />

                <div className="completion-hero-inner">
                  <motion.div
                    className="completion-check"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      delay: 0.15,
                      duration: 0.32,
                      ease: "easeOut",
                    }}
                  >
                    <CheckCircle2 size={32} />
                  </motion.div>

                  <motion.h2
                    className="completion-title"
                    variants={fadeUp}
                    custom={1}
                    initial="hidden"
                    animate="visible"
                  >
                    Session Complete
                  </motion.h2>

                  <motion.p
                    className="completion-subtitle"
                    variants={fadeUp}
                    custom={2}
                    initial="hidden"
                    animate="visible"
                  >
                    Great work on your{" "}
                    <strong>{pendingWorkout.exercise_name}</strong> session.
                    Your progress has been captured.
                  </motion.p>

                  {/* Performance insight badge */}
                  {(() => {
                    const insight = getPerformanceInsight(pendingWorkout);
                    const InsightIcon = insight.icon;
                    return (
                      <motion.div
                        className={`performance-insight ${insight.cls}`}
                        variants={scaleIn}
                        custom={3}
                        initial="hidden"
                        animate="visible"
                      >
                        <InsightIcon size={14} />
                        {insight.label}
                      </motion.div>
                    );
                  })()}
                </div>
              </motion.div>

              {/* Summary metric cards */}
              <div className="completion-section">
                <h3 className="completion-section-title">Session Summary</h3>
                <div className="summary-grid">
                  <SummaryCard
                    icon={Dumbbell}
                    label="Exercise"
                    value={pendingWorkout.exercise_name}
                    color="#6366F1"
                    index={0}
                  />
                  <SummaryCard
                    icon={RotateCcw}
                    label="Reps"
                    value={pendingWorkout.reps}
                    color="#8B5CF6"
                    index={1}
                  />
                  <SummaryCard
                    icon={Clock}
                    label="Duration"
                    value={pendingWorkout.duration}
                    color="#06B6D4"
                    index={2}
                  />
                  <SummaryCard
                    icon={Flame}
                    label="Calories"
                    value={`${pendingWorkout.calories_burned} kcal`}
                    color="#F59E0B"
                    index={3}
                  />
                  <SummaryCard
                    icon={Target}
                    label="Form Score"
                    value={
                      pendingWorkout.form_score != null
                        ? `${pendingWorkout.form_score}%`
                        : "N/A"
                    }
                    color="#10B981"
                    index={4}
                  />
                </div>
              </div>

              {/* Actions */}
              <motion.div
                className="completion-actions"
                variants={fadeUp}
                custom={2}
                initial="hidden"
                animate="visible"
              >
                <motion.button
                  type="button"
                  className="action-save"
                  onClick={handleSave}
                  whileHover={{
                    y: -2,
                    boxShadow: "0 12px 32px rgba(99,102,241,0.28)",
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <CheckCircle2 size={17} />
                  Save Workout
                </motion.button>

                <motion.button
                  type="button"
                  className="action-discard"
                  onClick={handleDiscard}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <XCircle size={15} />
                  Discard Session
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
