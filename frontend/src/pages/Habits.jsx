// src/pages/Habits.jsx
/*
==================================================
AI Gym & Fitness Assistant

File: Habits.jsx

Purpose:
Tracks daily wellness habits and helps
users build long-term consistency.

Functionality:
- Logs daily habits.
- Supports entry previews.
- Supports entry editing.
- Prevents duplicate entries.
- Displays weekly progress.
- Displays streak tracking.
- Displays habit history.
- Supports responsive layouts.

Responsibilities:
Habit tracking
Streak management
History management
Progress visualization

Used By:
Habits page

==================================================
*/
import { useEffect, useRef, useState } from "react";

import { motion } from "framer-motion";

import {
  Droplets,
  Moon,
  Activity,
  Dumbbell,
  Flame,
  Check,
  CalendarClock,
  History as HistoryIcon,
  Sparkles,
  AlertCircle,
} from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";

import {
  logHabit,
  updateHabit,
  getHabitHistory,
} from "../services/habitService";

import "../styles/habits.css";

/* ================================================
   Date helpers — all LOCAL timezone, never UTC
   ================================================
   ISSUE 1 FIX:
   The previous code used `new Date().toISOString().split("T")[0]` in two
   critical places (isoToday and getCurrentWeekDays). toISOString() always
   serialises in UTC, so for any timezone east of UTC (e.g. IST = UTC+5:30)
   a local Saturday can become Sunday in UTC once it passes 18:30 local time,
   and for timezones west of UTC the opposite shift occurs.  The result was
   that the habit-matrix column for "Saturday" contained Sunday's data (or
   whichever adjacent day the UTC conversion landed on).

   Fix: replace every ISO-string derivation that feeds the weekly matrix or
   the "today" comparison with localDateString(), which pads the *local*
   year/month/day into YYYY-MM-DD without any timezone conversion.
   The history records that come from the backend already carry YYYY-MM-DD
   strings in the user's local date (they are created on the server from the
   date the user explicitly chose), so using localDateString() keeps the
   keys in sync with those records.
================================================ */

/**
 * Returns "YYYY-MM-DD" for a Date object in the browser's LOCAL timezone.
 * Never use toISOString() for calendar date keys — it returns UTC.
 */
function localDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Returns the LOCAL "YYYY-MM-DD" string for today minus `offsetDays` days.
 * Previously used toISOString() which triggered the Saturday→Sunday shift.
 */
function isoToday(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return localDateString(d); // ← FIX: was d.toISOString().split("T")[0]
}

/**
 * Returns today's date as "YYYY-MM-DD" for use as the max= attribute on the
 * date input (ISSUE 2).  Kept as a separate named helper so its purpose is
 * obvious at the call-site.
 */
function todayLocalString() {
  return localDateString(new Date());
}

/**
 * Returns the ISO-LOCAL date strings for Mon–Sun of the current week.
 * Previously used toISOString() on the computed Date objects, which caused
 * the same UTC shift as isoToday().
 */
function getCurrentWeekDays() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun … 6=Sat
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(localDateString(d)); // ← FIX: was d.toISOString().split("T")[0]
  }
  return days; // [Mon, Tue, Wed, Thu, Fri, Sat, Sun] in local time
}

/* ================================================
   Payload sanitiser
   ================================================
   ISSUE 3 FIX — 422 Unprocessable Entity:
   HTML <input type="number"> always yields a *string* value in React's
   onChange / formData state (e.g. "2.5", "8", "6000").  When that raw
   formData object is passed straight to logHabit() / updateHabit(), the
   JSON body contains string values for water_intake, sleep_hours, and steps.
   FastAPI's Pydantic model declares those fields as float/int, so it rejects
   the request with HTTP 422 Unprocessable Entity — the backend never writes
   anything to the DB.

   Fix: sanitizePayload() casts all three numeric fields explicitly before
   the payload reaches the service layer.  workout_done is already a boolean
   (the checkbox sets it via `checked`), and date is already a string, so
   neither needs conversion.  All other fields and the shape of the object
   are left untouched.
================================================ */

/**
 * Coerces form string values to the types the backend Pydantic model expects.
 * Call this immediately before any logHabit() or updateHabit() call.
 */
function sanitizePayload(habit) {
  return {
    ...habit,
    water_intake: parseFloat(habit.water_intake),
    sleep_hours: parseFloat(habit.sleep_hours),
    steps: parseInt(habit.steps, 10),
    // workout_done is already boolean; date is already "YYYY-MM-DD" string
  };
}

/* ================================================
   Presentation helpers
   (read-only, derived from `history` for display only —
   no new state, no new requests, no change to validation
   or to what gets sent to the backend)
================================================ */

const HABIT_GOALS = {
  water_intake: 2,
  sleep_hours: 7,
  steps: 6000,
};

const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function buildHistoryMap(history) {
  const map = {};
  history.forEach((h) => {
    if (!h?.date) return;
    map[h.date] = h;
  });
  return map;
}

function computeStreak(historyMap, predicate) {
  const todayKey = isoToday(0);
  let cursorOffset = predicate(historyMap[todayKey]) ? 0 : 1;
  let streak = 0;

  while (true) {
    const key = isoToday(cursorOffset);
    const record = historyMap[key];
    if (record && predicate(record)) {
      streak++;
      cursorOffset++;
    } else {
      break;
    }
  }

  return streak;
}

const HABIT_ROWS = [
  {
    key: "water_intake",
    label: "Water Intake",
    icon: Droplets,
    accent: "var(--accent-cyan, #06b6d4)",
    soft: "var(--accent-cyan-soft, rgba(6, 182, 212, 0.12))",
    format: (r) => `${r.water_intake} L`,
    isComplete: (r) => Number(r?.water_intake) >= HABIT_GOALS.water_intake,
  },
  {
    key: "sleep_hours",
    label: "Sleep",
    icon: Moon,
    accent: "var(--secondary-500, #8b5cf6)",
    soft: "var(--secondary-soft, rgba(139, 92, 246, 0.12))",
    format: (r) => `${r.sleep_hours} h`,
    isComplete: (r) => Number(r?.sleep_hours) >= HABIT_GOALS.sleep_hours,
  },
  {
    key: "steps",
    label: "Steps",
    icon: Activity,
    accent: "var(--accent-700, #6366f1)",
    soft: "var(--accent-50, #eef2ff)",
    format: (r) => `${r.steps}`,
    isComplete: (r) => Number(r?.steps) >= HABIT_GOALS.steps,
  },
  {
    key: "workout_done",
    label: "Workout",
    icon: Dumbbell,
    accent: "var(--success-500, #10b981)",
    soft: "var(--success-soft, rgba(16, 185, 129, 0.12))",
    format: (r) => (r.workout_done ? "Completed" : "Skipped"),
    isComplete: (r) => !!r?.workout_done,
  },
];

/* ================================================
   Small presentational pieces
================================================ */

function DayCircle({ record, accent, soft, isComplete }) {
  if (!record) {
    return <span className="day-circle day-circle--empty" />;
  }

  const done = isComplete(record);

  return (
    <span
      className={`day-circle ${done ? "day-circle--done" : "day-circle--logged"}`}
      style={{
        background: done ? accent : soft,
        borderColor: accent,
      }}
    >
      {done && <Check size={12} strokeWidth={3} />}
    </span>
  );
}

function MatrixRow({ row, days, historyMap, index }) {
  const Icon = row.icon;
  const streak = computeStreak(historyMap, row.isComplete);

  return (
    <motion.div
      className="matrix-row"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 * index, ease: "easeInOut" }}
    >
      <div className="matrix-row-label">
        <span
          className="matrix-row-icon"
          style={{ background: row.soft, color: row.accent }}
        >
          <Icon size={16} />
        </span>
        {row.label}
      </div>

      <div className="matrix-row-days">
        {days.map((date) => (
          <DayCircle
            key={date}
            record={historyMap[date]}
            accent={row.accent}
            soft={row.soft}
            isComplete={row.isComplete}
          />
        ))}
      </div>

      <div className="matrix-row-streak">
        <Flame size={14} />
        {streak}
      </div>
    </motion.div>
  );
}

function HistoryEntry({ habit, index }) {
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

      <div className="timeline-card">
        <div className="timeline-date">{habit.date}</div>

        <div className="timeline-grid">
          <div className="timeline-stat">
            <Droplets size={14} />
            <span>{habit.water_intake} L</span>
          </div>

          <div className="timeline-stat">
            <Moon size={14} />
            <span>{habit.sleep_hours} h</span>
          </div>

          <div className="timeline-stat">
            <Activity size={14} />
            <span>{habit.steps} steps</span>
          </div>

          <div
            className={`timeline-stat timeline-stat--workout ${
              habit.workout_done ? "is-complete" : ""
            }`}
          >
            <Dumbbell size={14} />
            <span>{habit.workout_done ? "Completed" : "Skipped"}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ================================================
   Main Page
================================================ */

export default function Habit() {
  const [formData, setFormData] = useState({
    water_intake: "",
    sleep_hours: "",
    steps: "",
    workout_done: false,
    // ISSUE 2 FIX: still default to today, but now enforced as local date
    date: todayLocalString(),
  });

  const [history, setHistory] = useState([]);
  const [pendingHabit, setPendingHabit] = useState(null);

  // ISSUE 4 FIX — holds the existing record for the selected date (if any)
  // while the "already logged" confirmation dialog is open.
  const [duplicateModal, setDuplicateModal] = useState({
    open: false,
    existing: null,
  });

  const formRef = useRef(null);
  const historyRef = useRef(null);

  const loadHistory = async () => {
    try {
      const data = await getHabitHistory();
      setHistory(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // Step 1: validate and move to preview state — no DB write yet.
  const handlePreview = () => {
    const { water_intake, sleep_hours, steps, date } = formData;

    if (!water_intake || !sleep_hours || !steps) {
      alert("Please fill all fields.");
      return;
    }

    // ISSUE 2 FIX — validation layer: reject future dates even if the UI
    // max= constraint is bypassed (e.g. via DevTools or programmatic input).
    if (date > todayLocalString()) {
      alert("You cannot log habits for a future date.");
      return;
    }

    setPendingHabit({ ...formData });
  };

  const resetForm = () => {
    setPendingHabit(null);
    setFormData({
      water_intake: "",
      sleep_hours: "",
      steps: "",
      workout_done: false,
      date: todayLocalString(), // ← FIX: local date, not toISOString()
    });
  };

  // Creates a brand-new row. Only called once we already know (from the
  // loaded history) that no entry exists yet for the selected date.
  const saveNewHabit = async (habitToSave) => {
    try {
      await logHabit(sanitizePayload(habitToSave)); // ← ISSUE 3 FIX: coerce types
      await loadHistory();
      resetForm();
    } catch (error) {
      if (error?.response?.status === 409) {
        await loadHistory();
        alert(
          "An entry for this date was just created elsewhere. Please review and try again.",
        );
        return;
      }
      console.error(error);
      alert("Unable to save habit.");
    }
  };

  // Step 2a: user confirms — write to DB, but first check whether this
  // date already has an entry.
  const handleConfirmSave = async () => {
    if (!pendingHabit) return;

    const existing = historyMap[pendingHabit.date];
    if (existing) {
      setDuplicateModal({ open: true, existing });
      return;
    }

    await saveNewHabit(pendingHabit);
  };

  // Step 2b: user discards — back to form, data preserved for correction.
  const handleDiscard = () => {
    setPendingHabit(null);
  };

  const handleEditExistingConfirm = async () => {
    const { existing } = duplicateModal;
    if (!existing || !pendingHabit) return;

    try {
      await updateHabit(existing.id, sanitizePayload(pendingHabit)); // ← ISSUE 3 FIX
      await loadHistory();
      setDuplicateModal({ open: false, existing: null });
      resetForm();
    } catch (error) {
      console.error(error);
      alert("Unable to update habit.");
    }
  };

  const handleEditExistingCancel = () => {
    setDuplicateModal({ open: false, existing: null });
  };

  // Presentational-only derived data for the hero stats and matrix.
  const historyMap = buildHistoryMap(history);
  const weekDays = getCurrentWeekDays();
  const loggedThisWeek = weekDays.filter((d) => historyMap[d]).length;
  const dayStreak = computeStreak(historyMap, (r) => !!r);
  const latest = history?.[0] ?? null;

  // The max date a user is allowed to pick — today in local time (ISSUE 2).
  const maxDate = todayLocalString();

  const scrollToForm = () =>
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const scrollToHistory = () =>
    historyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <DashboardLayout>
      <div className="habits-page">
        {/* ───────────────── Hero ───────────────── */}
        <motion.section
          className="habits-hero"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
        >
          <div className="habits-hero-accent habits-hero-accent--a" />
          <div className="habits-hero-accent habits-hero-accent--b" />

          <div className="habits-hero-content">
            <div className="habits-hero-text">
              <span className="habits-hero-eyebrow">
                <Sparkles size={14} />
                Wellness Tracking
              </span>

              <h1 className="habits-hero-title">
                Build consistency, every day
              </h1>

              <p className="habits-hero-subtitle">
                Log your water, sleep, steps and workouts, and watch your
                streaks grow week over week.
              </p>

              <div className="habits-hero-pills">
                <span className="hero-pill">
                  <Flame size={14} />
                  {dayStreak} Day Streak
                </span>

                <span className="hero-pill">
                  <CalendarClock size={14} />
                  {loggedThisWeek}/7 Logged This Week
                </span>

                <span className="hero-pill">
                  <HistoryIcon size={14} />
                  {history.length} Total Logs
                </span>
              </div>
            </div>

            <div className="habits-hero-actions">
              <button
                type="button"
                className="hero-btn hero-btn--primary"
                onClick={scrollToForm}
              >
                Log Today
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

        {/* ───────────────── Summary Cards ───────────────── */}
        <div className="habit-summary-grid">
          {HABIT_ROWS.map((row, idx) => {
            const Icon = row.icon;
            const value = latest ? row.format(latest) : "—";
            const complete = latest ? row.isComplete(latest) : false;

            return (
              <motion.div
                className="habit-summary-card"
                key={row.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: 0.06 * idx,
                  ease: "easeInOut",
                }}
                whileHover={{ y: -3 }}
              >
                <span
                  className="habit-summary-icon"
                  style={{ background: row.soft, color: row.accent }}
                >
                  <Icon size={18} />
                </span>

                <div className="habit-summary-body">
                  <span className="habit-summary-label">{row.label}</span>
                  <span className="habit-summary-value">{value}</span>
                </div>

                <span
                  className={`habit-summary-badge ${complete ? "is-complete" : ""}`}
                  style={complete ? { background: row.accent } : undefined}
                >
                  {complete ? <Check size={12} strokeWidth={3} /> : null}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* ───────────────── Weekly Matrix ───────────────── */}
        <motion.div
          className="habit-matrix-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1, ease: "easeInOut" }}
        >
          <div className="matrix-header">
            <h2>This Week</h2>
            <p>Your last 7 days at a glance.</p>
          </div>

          <div className="matrix-table">
            <div className="matrix-row matrix-row--head">
              <div className="matrix-row-label" />

              <div className="matrix-row-days">
                {weekDays.map((date, i) => (
                  <span
                    key={date}
                    className={`matrix-day-label ${date === isoToday(0) ? "is-today" : ""}`}
                  >
                    {DOW_LABELS[i]}
                  </span>
                ))}
              </div>

              <div className="matrix-row-streak matrix-row-streak--head">
                Streak
              </div>
            </div>

            {HABIT_ROWS.map((row, idx) => (
              <MatrixRow
                key={row.key}
                row={row}
                days={weekDays}
                historyMap={historyMap}
                index={idx}
              />
            ))}
          </div>
        </motion.div>

        {/* ───────────────── Log Form ───────────────── */}
        <motion.div
          className="habit-card"
          ref={formRef}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12, ease: "easeInOut" }}
        >
          <div className="habit-card-header">
            <h2>Log Your Habits</h2>
            {/* ISSUE 2: subtitle updated to reflect past-date logging is now allowed */}
            <p>
              Fill in your numbers for today or any previous day you missed.
            </p>
          </div>

          <div className="habit-form">
            <div className="field">
              <label className="field-label">
                <Droplets size={14} />
                Water Intake (Liters)
              </label>
              <input
                type="number"
                name="water_intake"
                placeholder="e.g. 2.5"
                value={formData.water_intake}
                onChange={handleChange}
              />
            </div>

            <div className="field">
              <label className="field-label">
                <Moon size={14} />
                Sleep Hours
              </label>
              <input
                type="number"
                name="sleep_hours"
                placeholder="e.g. 7.5"
                value={formData.sleep_hours}
                onChange={handleChange}
              />
            </div>

            <div className="field">
              <label className="field-label">
                <Activity size={14} />
                Steps
              </label>
              <input
                type="number"
                name="steps"
                placeholder="e.g. 8000"
                value={formData.steps}
                onChange={handleChange}
              />
            </div>

            <div className="field">
              <label className="field-label">
                <CalendarClock size={14} />
                Date
              </label>
              {/*
                ISSUE 2 FIX — UI layer:
                  max={maxDate} prevents the native date picker from letting
                  the user select any date after today.  No future date will
                  even be selectable in the calendar widget.
                  The validation in handlePreview() is the second layer of
                  defence for programmatic bypass.
              */}
              <input
                type="date"
                name="date"
                value={formData.date}
                max={maxDate}
                onChange={handleChange}
              />
            </div>

            <label className="workout-toggle">
              <input
                type="checkbox"
                name="workout_done"
                checked={formData.workout_done}
                onChange={handleChange}
              />
              <span className="toggle-track">
                <span className="toggle-thumb" />
              </span>
              <span className="toggle-label">
                <Dumbbell size={14} />
                Workout Completed
              </span>
            </label>
          </div>

          <button
            type="button"
            className="generate-btn"
            onClick={handlePreview}
          >
            Preview Entry
          </button>
        </motion.div>

        {/* ───────────────── Preview & Confirm ───────────────── */}
        {pendingHabit && (
          <motion.div
            className="habit-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="habit-card-header">
              <h2>Review Your Entry</h2>
              <p>Confirm the details below before saving to the database.</p>
            </div>

            <div className="timeline-grid">
              <div className="timeline-stat">
                <Droplets size={14} />
                <span>{pendingHabit.water_intake} L water</span>
              </div>
              <div className="timeline-stat">
                <Moon size={14} />
                <span>{pendingHabit.sleep_hours} hrs sleep</span>
              </div>
              <div className="timeline-stat">
                <Activity size={14} />
                <span>{pendingHabit.steps} steps</span>
              </div>
              <div
                className={`timeline-stat timeline-stat--workout ${pendingHabit.workout_done ? "is-complete" : ""}`}
              >
                <Dumbbell size={14} />
                <span>
                  {pendingHabit.workout_done ? "Workout done" : "No workout"}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                className="generate-btn"
                onClick={handleConfirmSave}
                style={{ flex: 1 }}
              >
                Save Habit
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

        {/* ───────────────── Duplicate Entry Confirmation ───────────────── */}
        {duplicateModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="duplicate-habit-title"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: "20px",
            }}
          >
            <motion.div
              className="habit-modal"
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{
                background: "#ffffff",
                borderRadius: "20px",
                padding: "28px",
                maxWidth: "400px",
                width: "100%",
                boxShadow: "0 20px 60px rgba(15, 23, 42, 0.25)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  marginBottom: "16px",
                }}
              >
                <span
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "rgba(245, 158, 11, 0.12)",
                    color: "#d97706",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <AlertCircle size={18} />
                </span>
                <h3
                  id="duplicate-habit-title"
                  style={{
                    margin: 0,
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#111827",
                  }}
                >
                  Entry already exists
                </h3>
              </div>

              <p
                style={{
                  margin: "0 0 24px",
                  fontSize: "13.5px",
                  color: "#6b7280",
                  lineHeight: 1.6,
                }}
              >
                {duplicateModal.existing?.date === isoToday(0)
                  ? "You already logged habits for today. Do you want to edit today's entry?"
                  : `You already logged habits for ${duplicateModal.existing?.date}. Do you want to edit that entry?`}
              </p>

              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="button"
                  className="generate-btn"
                  style={{ flex: 1 }}
                  onClick={handleEditExistingConfirm}
                >
                  Edit Entry
                </button>
                <button
                  type="button"
                  className="hero-btn hero-btn--ghost"
                  style={{ flex: 1 }}
                  onClick={handleEditExistingCancel}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ───────────────── History ───────────────── */}
        <div className="history-card" ref={historyRef}>
          <div className="history-card-header">
            <h2>Habit History</h2>
            <p>Every day you've logged, in order.</p>
          </div>

          {history.length === 0 ? (
            <div className="empty-state">
              <HistoryIcon size={28} />
              <p>No habit records found.</p>
              <span>Log today's habits above to start your streak.</span>
            </div>
          ) : (
            <div
              className="timeline"
              role="region"
              aria-label="Habit history timeline"
            >
              {history.map((habit, idx) => (
                <HistoryEntry key={habit.id} habit={habit} index={idx} />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
