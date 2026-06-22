// src/pages/Dashboard.jsx
/*
==================================================
AI Gym & Fitness Assistant

File: Dashboard.jsx

Purpose:
Displays a personalized fitness dashboard
with analytics, progress tracking, and
quick access to all major modules.

Functionality:
- Displays fitness analytics.
- Displays workout trends.
- Displays wellness scores.
- Displays consistency tracking.
- Displays achievements.
- Displays recent activities.
- Displays quick actions.
- Personalizes the user greeting.
- Supports responsive layouts.

Responsibilities:
Analytics visualization
Progress tracking
User insights
Module navigation

Used By:
Dashboard page

==================================================
*/
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import WorkoutChart from "../components/charts/WorkoutChart";
import { getAnalytics } from "../services/analyticsService";
import { getProfile } from "../services/profileService";
import { getConsistency } from "../services/consistencyService";
import { getAchievements } from "../services/achievementService";
import ConsistencyTracker from "../components/dashboard/ConsistencyTracker";
import AchievementsPanel from "../components/dashboard/AchievementsPanel";
import WellnessScoreWidget from "../components/common/WellnessScoreWidget";
import {
  Dumbbell,
  Activity,
  Target,
  Footprints,
  Moon,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  MessageSquare,
  Apple,
  BarChart2,
  BookOpen,
  Flame,
  Timer,
  Droplets,
} from "lucide-react";
import "../styles/dashboard.css";

// ── Animation Variants ──────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut", delay: i * 0.07 },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, ease: "easeOut" } },
};

// ── TrendBadge ──────────────────────────────────────────────────────────────

function TrendBadge({ direction }) {
  if (!direction) return null;

  if (direction === "up")
    return (
      <span className="trend-badge trend-up">
        <TrendingUp size={11} />
      </span>
    );

  if (direction === "down")
    return (
      <span className="trend-badge trend-down">
        <TrendingDown size={11} />
      </span>
    );

  return (
    <span className="trend-badge trend-neutral">
      <Minus size={11} />
    </span>
  );
}

// ── StatCard ────────────────────────────────────────────────────────────────

function StatCard({ icon, title, value, subtitle, trend, index, iconColor }) {
  return (
    <motion.div
      className="stat-card"
      variants={fadeUp}
      custom={index}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <div className={`stat-icon-wrap ${iconColor || "icon-indigo"}`}>
        {icon}
      </div>
      <div className="stat-body">
        <p className="stat-title">{title}</p>
        <p className="stat-value">{value}</p>
        <div className="stat-footer">
          <span className="stat-subtitle">{subtitle}</span>
          <TrendBadge direction={trend} />
        </div>
      </div>
    </motion.div>
  );
}

// ── QuickActionCard ─────────────────────────────────────────────────────────

function QuickActionCard({ icon, title, description, onClick, index }) {
  return (
    <motion.button
      className="action-card"
      variants={fadeUp}
      custom={index}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      type="button"
    >
      <div className="action-icon">{icon}</div>
      <div className="action-text">
        <p className="action-title">{title}</p>
        <p className="action-desc">{description}</p>
      </div>
      <ArrowRight size={14} className="action-arrow" />
    </motion.button>
  );
}

// ── ActivityItem ────────────────────────────────────────────────────────────

function ActivityItem({ icon, title, time, index }) {
  return (
    <motion.li
      className="activity-item"
      variants={fadeUp}
      custom={index}
      initial="hidden"
      animate="visible"
    >
      <div className="activity-dot">{icon}</div>
      <div className="activity-body">
        <p className="activity-title">{title}</p>
        <p className="activity-time">{time}</p>
      </div>
    </motion.li>
  );
}

// ── CircularProgress ────────────────────────────────────────────────────────

function CircularProgress({ value }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div className="hero-progress-ring">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} className="ring-track" />
        <circle
          cx="70"
          cy="70"
          r={r}
          className="ring-fill"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 70 70)"
        />
      </svg>
      <div className="ring-label">
        <span className="ring-value">{value}%</span>
        <span className="ring-sub">Weekly Goal</span>
      </div>
    </div>
  );
}

// ── Dashboard ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();

  // BUG FIX: useLocation() lets us detect when the user navigates back to
  // this route via client-side routing (e.g. clicking the sidebar link).
  // React Router does NOT unmount/remount the component on revisit, so
  // useEffect([]) only ran once — on the very first visit — and stale
  // (or empty) analytics were shown on every subsequent visit.
  const location = useLocation();

  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState(false);

  const [profile, setProfile] = useState(null);
  const [consistency, setConsistency] = useState(null);
  const [achievements, setAchievements] = useState(null);

  // BUG FIX: Include location.pathname (or location.key) in the dependency
  // array so analytics re-fetch every time the Dashboard route is activated,
  // not just on the initial mount.  This guarantees today's habit records
  // (water, sleep, steps) are always reflected when the user returns here.
  useEffect(() => {
    fetchAnalytics();
  }, [location.pathname]);

  useEffect(() => {
    (async () => {
      try {
        const data = await getProfile();
        setProfile(data);
      } catch {
        setProfile(null);
      }
    })();

    (async () => {
      try {
        const data = await getConsistency();
        setConsistency(data);
      } catch {
        setConsistency(null);
      }
    })();

    (async () => {
      try {
        const data = await getAchievements();
        setAchievements(data);
      } catch {
        setAchievements(null);
      }
    })();
  }, []);

  const fetchAnalytics = async () => {
    // BUG FIX: Reset analytics to null before each fetch so the loading
    // guard below prevents rendering stale or zero values while the new
    // request is in flight.  Without this reset, revisiting the page would
    // briefly display the previous (potentially zeroed) data.
    setAnalytics(null);
    setError(false);
    try {
      const data = await getAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error(err);
      setError(true);
    }
  };

  if (error) {
    return (
      <DashboardLayout>
        <div className="loading-page">Unable to load dashboard.</div>
      </DashboardLayout>
    );
  }

  // BUG FIX: analytics === null means the fetch is still in progress.
  // We must NOT fall through to the render below while loading because
  // every `analytics.xyz ?? 0` expression would silently produce 0,
  // making valid database values appear as zero to the user.
  if (!analytics) {
    return (
      <DashboardLayout>
        <div className="loading-page">
          <motion.div
            className="loading-spinner"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            Loading dashboard...
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  const workoutData = analytics?.workout_trend?.length
    ? analytics.workout_trend
    : [];

  const recentActivity = analytics?.recent_activity ?? [];

  const dc = analytics.daily_comparison ?? {};

  const displayName = profile?.name?.trim()
    ? profile.name.trim().split(/\s+/)[0]
    : "";

  // BUG FIX: Read the correct 7-day rolling average fields from the backend.
  // The original code used ?? 0 which masked nulls returned when habit logs
  // were present but the field name didn't match (e.g. a typo or old cached
  // response missing avg_daily_steps_7d).  We now use ?? null so that a
  // missing field surfaces as "—" rather than a misleading 0.
  //
  // These three fields must match exactly what analytics_service.py returns:
  //   avg_daily_steps_7d   — mean steps over the last 7 logged days
  //   avg_daily_water_7d   — mean water (L) over the last 7 logged days
  //   avg_daily_sleep_7d   — mean sleep (hrs) over the last 7 logged days
  const avgDailySteps7d = analytics.avg_daily_steps_7d ?? null;
  const avgDailyWater7d = analytics.avg_daily_water_7d ?? null;
  const avgDailySleep7d = analytics.avg_daily_sleep_7d ?? null;

  // Helper: display a numeric value or "—" when the backend returned null.
  // This prevents a legitimate 0 from the DB being indistinguishable from
  // "field not found / not yet calculated".
  const fmt = (v, suffix = "") =>
    v !== null && v !== undefined ? `${v}${suffix}` : "—";

  // KPI cards — all sourced from 7-day rolling window fields.
  const stats = [
    {
      icon: <Dumbbell size={18} />,
      title: "Total Workouts",
      value: analytics.total_workouts ?? "—",
      subtitle: "Completed",
      trend: dc.total_workouts ?? null,
      iconColor: "icon-indigo",
    },
    {
      icon: <Activity size={18} />,
      title: "Total Reps",
      value: analytics.total_reps ?? "—",
      subtitle: "All Exercises",
      trend: dc.total_reps ?? null,
      iconColor: "icon-violet",
    },
    {
      // Average Daily Water — last 7 calendar days, divides by days logged.
      icon: <Droplets size={18} />,
      title: "Avg Daily Water",
      value: fmt(avgDailyWater7d, " L"),
      subtitle: "Last 7 Days",
      trend: dc.avg_water ?? null,
      iconColor: "icon-cyan",
    },
    {
      // Average Daily Steps — last 7 calendar days, divides by days logged.
      icon: <Footprints size={18} />,
      title: "Avg Daily Steps",
      // BUG FIX: was `avgDailySteps7d.toLocaleString()` which throws when
      // avgDailySteps7d is null (field absent from response).
      value: avgDailySteps7d !== null ? avgDailySteps7d.toLocaleString() : "—",
      subtitle: "Last 7 Days",
      trend: dc.total_steps ?? null,
      iconColor: "icon-emerald",
    },
    {
      // Average Sleep — last 7 calendar days.
      icon: <Moon size={18} />,
      title: "Sleep",
      value: fmt(avgDailySleep7d, "h"),
      subtitle: "Last 7 Days",
      trend: dc.avg_sleep ?? null,
      iconColor: "icon-amber",
    },
  ];

  const quickActions = [
    {
      icon: <Apple size={18} />,
      title: "Generate Meal Plan",
      description: "Create an AI-powered diet plan.",
      route: "/diet",
    },
    {
      icon: <MessageSquare size={18} />,
      title: "Open Fitness Chat",
      description: "Ask fitness and nutrition questions.",
      route: "/chat",
    },
    {
      icon: <BookOpen size={18} />,
      title: "Log Habit",
      description: "Track sleep, water and steps.",
      route: "/habits",
    },
    {
      icon: <Dumbbell size={18} />,
      title: "Workout Tracker",
      description: "Log and track your workouts.",
      route: "/workout",
    },
    {
      icon: <Activity size={18} />,
      title: "AI Webcam Trainer",
      description: "Real-time AI form analysis.",
      route: "/webcam",
    },
    {
      icon: <BarChart2 size={18} />,
      title: "View Reports",
      description: "View your overall performance.",
      route: "/reports",
    },
  ];

  return (
    <DashboardLayout>
      <div className="dashboard-root">
        {/* ── Hero ──────────────────────────────────────────── */}
        <motion.section
          className="hero-section"
          variants={fadeIn}
          initial="hidden"
          animate="visible"
        >
          <div className="hero-blob hero-blob-1" aria-hidden="true" />
          <div className="hero-blob hero-blob-2" aria-hidden="true" />

          <div className="hero-content">
            <div className="hero-left">
              <motion.span
                className="hero-eyebrow"
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0}
              >
                <Zap size={12} />
                Weekly Progress
              </motion.span>

              <motion.h1
                className="hero-heading"
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={1}
              >
                Welcome Back{displayName ? `, ${displayName}` : ""}
              </motion.h1>

              <motion.p
                className="hero-subtext"
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={2}
              >
                You're making steady progress toward your personalized fitness
                goals.
                <br />
                Keep the momentum going.
              </motion.p>

              <motion.div
                className="hero-pills"
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={3}
              >
                {/* BUG FIX: Hero pills now use the same null-safe values as
                    the KPI cards above, sourced from the correct 7-day
                    rolling average fields.  Previously these could render
                    "0 L avg daily water" when the field was null/undefined. */}
                <div className="hero-pill">
                  <span className="pill-dot dot-green" />
                  <span>
                    {analytics.total_workouts ?? "—"} workouts this week
                  </span>
                </div>
                <div className="hero-pill">
                  <span className="pill-dot dot-indigo" />
                  <span>{fmt(avgDailyWater7d, " L")} avg daily water</span>
                </div>
                <div className="hero-pill">
                  <span className="pill-dot dot-cyan" />
                  <span>
                    {avgDailySteps7d !== null
                      ? avgDailySteps7d.toLocaleString()
                      : "—"}{" "}
                    avg daily steps
                  </span>
                </div>
              </motion.div>

              <motion.div
                className="hero-actions"
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={4}
              >
                <button
                  className="btn-primary-hero"
                  onClick={() => navigate("/workout")}
                >
                  Start Workout
                  <ArrowRight size={15} />
                </button>
                <button
                  className="btn-secondary-hero"
                  onClick={() => navigate("/reports")}
                >
                  View Reports
                </button>
              </motion.div>
            </div>

            <motion.div
              className="hero-right"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
            >
              <CircularProgress
                value={parseFloat(analytics.workout_completion_rate) || 0}
              />
            </motion.div>
          </div>
        </motion.section>

        {/* ── KPI Stats ─────────────────────────────────────── */}
        <section className="stats-section">
          <div className="stats-grid">
            {stats.map((s, i) => (
              <StatCard key={s.title} {...s} index={i} />
            ))}
          </div>
        </section>

        {/* ── NEW: Consistency Tracker ─────────────────────────── */}
        <ConsistencyTracker data={consistency} />

        {/* ── Chart ─────────────────────────────────────────── */}
        <motion.section
          className="chart-section"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
        >
          <div className="chart-card">
            <div className="chart-header">
              <div>
                <h3 className="chart-title">Workout Trend</h3>
                <p className="chart-subtitle">Daily workouts this week</p>
              </div>
              <div className="chart-legend">
                <span className="legend-dot" />
                <span>Workouts</span>
              </div>
            </div>
            <div className="chart-body">
              {workoutData.length > 0 ? (
                <WorkoutChart data={workoutData} />
              ) : (
                <p className="empty-state-text">No workout data available.</p>
              )}
            </div>
          </div>
        </motion.section>

        {/* ── Bottom Grid ───────────────────────────────────── */}
        <section className="dashboard-bottom">
          {/* Quick Actions */}
          <div className="panel-card">
            <div className="panel-header">
              <h3 className="panel-title">Quick Actions</h3>
              <p className="panel-subtitle">Jump to a key task</p>
            </div>
            <div className="quick-actions-grid">
              {quickActions.map((a, i) => (
                <QuickActionCard
                  key={a.title}
                  {...a}
                  index={i}
                  onClick={() => navigate(a.route)}
                />
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="panel-card">
            <div className="panel-header">
              <h3 className="panel-title">Recent Activity</h3>
              <p className="panel-subtitle">Your latest actions</p>
            </div>
            {recentActivity.length > 0 ? (
              <ul className="activity-list">
                {recentActivity.map((item, i) => (
                  <ActivityItem
                    key={`${item.title}-${i}`}
                    {...item}
                    index={i}
                  />
                ))}
              </ul>
            ) : (
              <p className="empty-state-text">No recent activity yet.</p>
            )}
          </div>
        </section>

        {/* ── NEW: Achievements ─────────────────────────────── */}
        <section
          className="dashboard-bottom"
          style={{ gridTemplateColumns: "1fr" }}
        >
          <AchievementsPanel data={achievements} />
        </section>
      </div>
    </DashboardLayout>
  );
}
