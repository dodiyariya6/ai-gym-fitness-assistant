// src/pages/Webcam.jsx
/*
==================================================
AI Gym & Fitness Assistant

File: Webcam.jsx

Purpose:
Provides an AI-powered webcam trainer
for real-time exercise analysis.

Functionality:
- Launches webcam sessions.
- Supports exercise selection.
- Tracks repetitions.
- Tracks workout duration.
- Calculates calories burned.
- Evaluates form scores.
- Displays session summaries.
- Saves completed workouts.
- Supports responsive layouts.

Responsibilities:
Live workout tracking
Form analysis
Session management
Workout persistence

Used By:
Webcam page

==================================================
*/
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dumbbell,
  Play,
  CheckCircle2,
  XCircle,
  Activity,
  Flame,
  Clock,
  Target,
  Award,
  ChevronDown,
  Keyboard,
  Sparkles,
  TrendingUp,
  RotateCcw,
} from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout";
import { saveWorkout } from "../services/workoutService";
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

/* ── Exercise meta ──────────────────────────────── */
const EXERCISES = [
  { value: "squat", label: "Squats", icon: Dumbbell },
  { value: "curl", label: "Bicep Curls", icon: Activity },
  { value: "pushup", label: "Pushups", icon: Target },
  { value: "lunge", label: "Lunges", icon: TrendingUp },
  { value: "jumpingjack", label: "Jumping Jacks", icon: Flame },
];

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

/* ── Main Component ─────────────────────────────── */
export default function Webcam() {
  const [exercise, setExercise] = useState("squat");
  const [loading, setLoading] = useState(false);
  const [pendingWorkout, setPendingWorkout] = useState(null);

  /* ── unchanged logic ── */
  const startSession = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://127.0.0.1:8000/pose/start?exercise=${exercise}`,
      );
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (!data?.exercise_name) {
        throw new Error("Invalid session response");
      }
      const today = new Date().toISOString().split("T")[0];
      setPendingWorkout({
        exercise_name: data.exercise_name,
        sets: 1,
        reps: data.reps,
        duration: data.duration,
        calories_burned: data.calories_burned,
        form_score: data.form_score,
        notes: "AI Webcam Session",
        workout_date: today,
      });
    } catch (error) {
      console.error("Webcam Session Error:", error);
      alert("Unable to start session.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await saveWorkout(pendingWorkout);
      alert("Workout saved successfully.");
      setPendingWorkout(null);
    } catch (error) {
      console.error("Workout Save Error:", error);
      alert("Unable to save workout.");
    }
  };

  const handleDiscard = () => setPendingWorkout(null);

  /* ── derived ── */
  const activeExercise = EXERCISES.find((e) => e.value === exercise);

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
                Your form is analysed live, rep by rep. Choose an exercise and
                let your AI trainer take over.
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
                  <Flame size={11} /> Calorie Tracking
                </span>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* ── MAIN CARD: exercise selector + launch ── */}
        <AnimatePresence mode="wait">
          {!pendingWorkout && (
            <motion.div
              key="launcher"
              className="webcam-main-card"
              variants={fadeUp}
              custom={1}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -12, transition: { duration: 0.22 } }}
            >
              {/* Exercise selector */}
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
                      disabled={loading}
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

              {/* Instructions */}
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
                    Press <kbd>Q</kbd> when you're done to end the session.
                  </li>
                </ul>
              </div>

              {/* Launch button */}
              <motion.button
                type="button"
                className={`launch-btn ${loading ? "launch-btn-loading" : ""}`}
                onClick={startSession}
                disabled={loading}
                whileHover={
                  !loading
                    ? { y: -2, boxShadow: "0 12px 32px rgba(99,102,241,0.30)" }
                    : {}
                }
                whileTap={!loading ? { scale: 0.98 } : {}}
              >
                {loading ? (
                  <>
                    <div className="launch-spinner" />
                    Opening Camera…
                  </>
                ) : (
                  <>
                    <Play size={16} fill="currentColor" />
                    Start Session — {activeExercise?.label}
                  </>
                )}
              </motion.button>

              <p className="webcam-tip">
                <Keyboard size={13} />
                Press <strong>Q</strong> inside the camera window to end your
                session
              </p>
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
