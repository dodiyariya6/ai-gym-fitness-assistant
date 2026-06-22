// src/pages/Workout.jsx
/*
==================================================
AI Gym & Fitness Assistant

File: Workout.jsx

Purpose:
Allows users to log workouts, review
sessions, and track long-term progress.

Functionality:
- Logs manual workouts.
- Displays workout history.
- Displays weekly trends.
- Displays workout statistics.
- Supports workout previews.
- Validates workout dates.
- Calculates performance trends.
- Supports responsive layouts.

Responsibilities:
Workout tracking
History management
Progress monitoring
Trend visualization

Used By:
Workout page

==================================================
*/
import { useEffect, useRef, useState } from "react";

import { motion } from "framer-motion";

import {
  Dumbbell,
  Flame,
  Repeat,
  Clock,
  Target,
  CalendarClock,
  FileText,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  History as HistoryIcon,
  Send,
} from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";

import { saveWorkout, getWorkoutHistory } from "../services/workoutService";

import "../styles/workout.css";

/* ================================================
   Date helper — LOCAL timezone, never UTC
   ================================================
   Mirrors the same fix applied to Habits.jsx.
   new Date().toISOString().split("T")[0] returns a UTC date string, which
   in IST (UTC+5:30) shifts the date backward by up to ~5.5 hours, meaning
   the default "today" value shown in the form and used after a reset would
   be yesterday's date for part of the day.

   localDateString() reads the browser's local year/month/day directly so
   the correct local calendar date is always used.
================================================ */

/**
 * Returns "YYYY-MM-DD" using the browser's LOCAL timezone.
 * Never use toISOString() for calendar date values — it returns UTC.
 */
function localDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Returns today's LOCAL date as "YYYY-MM-DD".
 * Used as both the form default and the max= cap on the date input.
 */
function todayLocalString() {
  return localDateString(new Date());
}

/* ================================================
   Presentation helpers
================================================ */

function daysAgo(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((today - d) / 86400000);
}

function weeklyTrend(history, getValue) {
  let thisWeek = 0;
  let lastWeek = 0;

  history.forEach((item) => {
    const age = daysAgo(item.workout_date);
    if (age === null) return;
    if (age >= 0 && age < 7) thisWeek += getValue(item);
    else if (age >= 7 && age < 14) lastWeek += getValue(item);
  });

  let delta = 0;
  if (lastWeek === 0) {
    delta = thisWeek > 0 ? 100 : 0;
  } else {
    delta = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
  }

  return { thisWeek, lastWeek, delta };
}

function formScoreColor(score) {
  const n = Number(score);
  if (
    score === "" ||
    score === null ||
    score === undefined ||
    Number.isNaN(n)
  ) {
    return "var(--text-secondary, #6b7280)";
  }
  if (n >= 80) return "var(--success-500, #10b981)";
  if (n >= 50) return "var(--warning-500, #f59e0b)";
  return "var(--danger-500, #ef4444)";
}

/* ================================================
   Small presentational pieces
================================================ */

function TrendChip({ delta }) {
  if (delta > 0) {
    return (
      <span className="trend-chip trend-chip--up">
        <TrendingUp size={13} />
        {delta}%
      </span>
    );
  }

  if (delta < 0) {
    return (
      <span className="trend-chip trend-chip--down">
        <TrendingDown size={13} />
        {Math.abs(delta)}%
      </span>
    );
  }

  return (
    <span className="trend-chip trend-chip--flat">
      <Minus size={13} />
      0%
    </span>
  );
}

function StatCard({ icon: Icon, label, value, trend, accent, soft, index }) {
  return (
    <motion.div
      className="workout-stat-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.06 * index, ease: "easeInOut" }}
      whileHover={{ y: -3 }}
    >
      <div className="workout-stat-top">
        <span
          className="workout-stat-icon"
          style={{ background: soft, color: accent }}
        >
          <Icon size={18} />
        </span>

        {trend !== undefined && <TrendChip delta={trend} />}
      </div>

      <span className="workout-stat-value">{value}</span>
      <span className="workout-stat-label">{label}</span>
    </motion.div>
  );
}

// BUG 1 FIX: preserve the unit that came from the backend ("52 sec" or "3 min").
function formatDuration(raw) {
  if (!raw && raw !== 0) return "—";
  const str = String(raw).trim();
  if (/^\d+\s*(sec|min)$/i.test(str)) return str;
  const num = parseInt(str.replace(/[^\d]/g, ""), 10);
  if (isNaN(num)) return "—";
  return `${num} min`;
}

function HistoryEntry({ workout, index }) {
  const hasFormScore =
    workout.form_score !== null &&
    workout.form_score !== undefined &&
    workout.form_score !== "";
  const scoreColor = hasFormScore
    ? formScoreColor(workout.form_score)
    : "var(--text-secondary, #6b7280)";

  return (
    <motion.div
      className="timeline-item"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: Math.min(index * 0.04, 0.3),
        ease: "easeInOut",
      }}
    >
      <span className="timeline-dot" />

      <div className="workout-timeline-card">
        <div className="workout-timeline-header">
          <div className="workout-timeline-title">
            <span className="workout-timeline-icon">
              <Dumbbell size={16} />
            </span>
            <span>{workout.exercise_name}</span>
          </div>

          <span
            className="form-score-badge"
            style={{ color: scoreColor, borderColor: scoreColor }}
          >
            <Target size={12} />
            {hasFormScore ? `${workout.form_score}%` : "N/A"}
          </span>
        </div>

        <div className="workout-timeline-grid">
          <div className="workout-timeline-stat">
            <Repeat size={14} />
            <span>
              {workout.sets} sets × {workout.reps} reps
            </span>
          </div>

          <div className="workout-timeline-stat">
            <Clock size={14} />
            <span>{formatDuration(workout.duration)}</span>
          </div>

          <div className="workout-timeline-stat">
            <Flame size={14} />
            <span>{workout.calories_burned ?? 0} kcal</span>
          </div>

          <div className="workout-timeline-stat">
            <CalendarClock size={14} />
            <span>{workout.workout_date}</span>
          </div>
        </div>

        {workout.notes && (
          <div className="workout-timeline-notes">
            <FileText size={13} />
            {workout.notes}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ================================================
   Main Page
================================================ */

export default function Workout() {
  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(false);

  const [pendingWorkout, setPendingWorkout] = useState(null);

  const [formData, setFormData] = useState({
    exercise_name: "",
    sets: "",
    reps: "",
    duration: "",
    notes: "",
    // FIX: was new Date().toISOString().split("T")[0] — UTC shift bug.
    // todayLocalString() reads local year/month/day so IST users always
    // get the correct local date as the default.
    workout_date: todayLocalString(),
  });

  const formRef = useRef(null);
  const historyRef = useRef(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await getWorkoutHistory();
      setHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Workout History Error:", error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Step 1: validate and move to preview — no DB write yet.
  const handlePreview = () => {
    if (!formData.exercise_name || !formData.sets || !formData.reps) {
      alert("Please fill all required fields.");
      return;
    }

    // FUTURE-DATE GUARD — validation layer:
    // Blocks future dates even if the user bypasses the max= constraint
    // via DevTools or direct input manipulation.
    if (formData.workout_date > todayLocalString()) {
      alert("You cannot log a workout for a future date.");
      return;
    }

    // Normalise duration to "N min" before preview.
    const rawDuration = formData.duration;
    const durationNum = parseInt(String(rawDuration).replace(/[^\d]/g, ""), 10);
    const normalisedDuration = rawDuration
      ? isNaN(durationNum)
        ? rawDuration
        : `${durationNum} min`
      : "";
    setPendingWorkout({ ...formData, duration: normalisedDuration });
  };

  // Step 2a: user confirms — write to DB.
  const handleConfirmSave = async () => {
    try {
      setLoading(true);
      await saveWorkout(pendingWorkout);
      await loadHistory();
      setPendingWorkout(null);
      setFormData({
        exercise_name: "",
        sets: "",
        reps: "",
        duration: "",
        notes: "",
        // FIX: was toISOString() — same UTC shift bug on reset.
        workout_date: todayLocalString(),
      });
    } catch (error) {
      console.error("Workout Save Error:", error);
      alert("Unable to save workout.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2b: user discards — return to form, data preserved for correction.
  const handleDiscard = () => {
    setPendingWorkout(null);
  };

  // ISSUE 3 FIX: calories shown in the hero and stat card must reflect only
  // the latest workout date, not the lifetime total.
  // Find the most recent workout_date from history (history is ordered desc
  // by created_at so history[0] is the newest record).
  const latestWorkoutDate = history.length > 0 ? history[0].workout_date : null;

  // Sum calories only for workouts on that latest date.
  const latestDayCalories = latestWorkoutDate
    ? history
        .filter((item) => item.workout_date === latestWorkoutDate)
        .reduce((sum, item) => sum + Number(item.calories_burned || 0), 0)
    : 0;

  const workoutsTrend = weeklyTrend(history, () => 1);
  const caloriesTrend = weeklyTrend(history, (item) =>
    Number(item.calories_burned || 0),
  );
  const lastWorkout = history?.[0] ?? null;

  // Max date allowed in the date picker — today in local time.
  const maxDate = todayLocalString();

  const scrollToForm = () =>
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const scrollToHistory = () =>
    historyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <DashboardLayout>
      <div className="workout-page-shell">
        {/* ───────────────── Hero ───────────────── */}
        <motion.section
          className="workout-hero"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
        >
          <div className="workout-hero-accent workout-hero-accent--a" />
          <div className="workout-hero-accent workout-hero-accent--b" />

          <div className="workout-hero-content">
            <div className="workout-hero-text">
              <span className="workout-hero-eyebrow">
                <Dumbbell size={14} />
                Training Log
              </span>

              <h1 className="workout-hero-title">
                Track and improve your training
              </h1>

              <p className="workout-hero-subtitle">
                Log every session, watch your output trend week over week, and
                keep your form honest.
              </p>

              <div className="workout-hero-pills">
                <span className="hero-pill">
                  <Dumbbell size={14} />
                  {history.length} Total Workouts
                </span>

                {/* ISSUE 3 FIX: show calories for latest workout date only */}
                <span className="hero-pill">
                  <Flame size={14} />
                  {latestDayCalories} kcal Burned Today
                </span>

                <span className="hero-pill">
                  <Trophy size={14} />
                  {workoutsTrend.thisWeek} This Week
                </span>
              </div>
            </div>

            <div className="workout-hero-actions">
              <button
                type="button"
                className="hero-btn hero-btn--primary"
                onClick={scrollToForm}
              >
                Log Workout
              </button>

              <button
                type="button"
                className="hero-btn hero-btn--ghost"
                onClick={scrollToHistory}
              >
                View History
              </button>
            </div>
          </div>
        </motion.section>

        {/* ───────────────── Stat Cards ───────────────── */}
        <div className="workout-stats-grid">
          <StatCard
            icon={Dumbbell}
            label="Total Workouts"
            value={history.length}
            trend={workoutsTrend.delta}
            accent="var(--accent-700, #6366f1)"
            soft="var(--accent-50, #eef2ff)"
            index={0}
          />

          {/* ISSUE 3 FIX: label and value show latest-day calories, not lifetime */}
          <StatCard
            icon={Flame}
            label="Calories Burned Today"
            value={latestDayCalories}
            trend={caloriesTrend.delta}
            accent="var(--warning-500, #f59e0b)"
            soft="rgba(245, 158, 11, 0.12)"
            index={1}
          />

          <StatCard
            icon={Trophy}
            label="Last Workout"
            value={lastWorkout ? lastWorkout.exercise_name : "—"}
            accent="var(--success-500, #10b981)"
            soft="rgba(16, 185, 129, 0.12)"
            index={2}
          />
        </div>

        {/* ───────────────── Log Form ───────────────── */}
        <motion.div
          className="workout-form-card"
          ref={formRef}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1, ease: "easeInOut" }}
        >
          <div className="workout-form-header">
            <h2>Log a Workout</h2>
            <p>Capture the details while they're fresh.</p>
          </div>

          <div className="workout-form-section">
            <span className="workout-form-section-label">Exercise</span>

            <div className="workout-form-grid">
              <div className="field field--wide">
                <label className="field-label">
                  <Dumbbell size={14} />
                  Exercise Name
                </label>
                <input
                  type="text"
                  name="exercise_name"
                  placeholder="e.g. Bench Press"
                  value={formData.exercise_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="field">
                <label className="field-label">
                  <Repeat size={14} />
                  Sets
                </label>
                <input
                  type="number"
                  name="sets"
                  placeholder="4"
                  value={formData.sets}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="field">
                <label className="field-label">
                  <Repeat size={14} />
                  Reps
                </label>
                <input
                  type="number"
                  name="reps"
                  placeholder="10"
                  value={formData.reps}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="field">
                <label className="field-label">
                  <Clock size={14} />
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  name="duration"
                  placeholder="e.g. 35"
                  value={formData.duration}
                  onChange={handleChange}
                  min="0"
                />
              </div>
            </div>
          </div>

          <div className="workout-form-divider" />

          <div className="workout-form-section">
            <span className="workout-form-section-label">Details</span>

            <div className="workout-form-grid">
              <div className="field">
                <label className="field-label">
                  <CalendarClock size={14} />
                  Date
                </label>
                {/*
                  FUTURE-DATE RESTRICTION — UI layer:
                  max={maxDate} prevents the native date picker from showing
                  or allowing any date after today.  The validation guard in
                  handlePreview() is the second layer of defence for any
                  programmatic bypass.
                  Past dates remain fully selectable — users can backfill
                  missed sessions.
                */}
                <input
                  type="date"
                  name="workout_date"
                  value={formData.workout_date}
                  max={maxDate}
                  onChange={handleChange}
                />
              </div>

              <div className="field field--wide">
                <label className="field-label">
                  <FileText size={14} />
                  Notes
                </label>
                <input
                  type="text"
                  name="notes"
                  placeholder="Optional notes about the session"
                  value={formData.notes}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            className="generate-btn"
            onClick={handlePreview}
          >
            <Send size={15} />
            Preview Workout
          </button>
        </motion.div>

        {/* ───────────────── Preview & Confirm ───────────────── */}
        {pendingWorkout && (
          <motion.div
            className="workout-form-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="workout-form-header">
              <h2>Review Your Workout</h2>
              <p>Confirm the details below before saving to the database.</p>
            </div>

            <div className="workout-timeline-grid">
              <div className="workout-timeline-stat">
                <Dumbbell size={14} />
                <span>{pendingWorkout.exercise_name}</span>
              </div>
              <div className="workout-timeline-stat">
                <Repeat size={14} />
                <span>
                  {pendingWorkout.sets} sets × {pendingWorkout.reps} reps
                </span>
              </div>
              <div className="workout-timeline-stat">
                <Clock size={14} />
                <span>{pendingWorkout.duration || "—"}</span>
              </div>
              <div className="workout-timeline-stat">
                <Target size={14} />
                <span>Form Score: N/A</span>
              </div>
              <div className="workout-timeline-stat">
                <Flame size={14} />
                <span>Calories: auto</span>
              </div>
              <div className="workout-timeline-stat">
                <CalendarClock size={14} />
                <span>{pendingWorkout.workout_date}</span>
              </div>
              {pendingWorkout.notes && (
                <div
                  className="workout-timeline-stat"
                  style={{ gridColumn: "span 2" }}
                >
                  <FileText size={14} />
                  <span>{pendingWorkout.notes}</span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                className="generate-btn"
                onClick={handleConfirmSave}
                disabled={loading}
                style={{ flex: 1 }}
              >
                {loading ? "Saving..." : "Save Workout"}
              </button>
              <button
                type="button"
                className="hero-btn hero-btn--ghost"
                onClick={handleDiscard}
                style={{ flex: 1 }}
              >
                Discard Entry
              </button>
            </div>
          </motion.div>
        )}

        {/* ───────────────── History ───────────────── */}
        <div className="history-card" ref={historyRef}>
          <div className="history-card-header">
            <h2>Workout History</h2>
            <p>Every session you've logged, most recent first.</p>
          </div>

          {history.length === 0 ? (
            <div className="empty-state">
              <HistoryIcon size={28} />
              <p>No workouts found.</p>
              <span>Log a workout above to start building your history.</span>
            </div>
          ) : (
            <div
              className="timeline"
              role="region"
              aria-label="Workout history timeline"
            >
              {history.map((workout, idx) => (
                <HistoryEntry
                  key={workout.id ?? `${workout.exercise_name}-${idx}`}
                  workout={workout}
                  index={idx}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}