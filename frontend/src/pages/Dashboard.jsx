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
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import WorkoutChart from "../components/charts/WorkoutChart";
import { getAnalytics } from "../services/analyticsService";
import { getProfile } from "../services/profileService"; // ← NEW
import { getConsistency } from "../services/consistencyService"; // ← NEW
import { getAchievements } from "../services/achievementService"; // ← NEW
import ConsistencyTracker from "../components/dashboard/ConsistencyTracker"; // ← NEW
import AchievementsPanel from "../components/dashboard/AchievementsPanel"; // ← NEW
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

  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState(false);

  // ── NEW: Profile / Consistency / Achievements state ───────────────────────
  // These are additive enrichments — failures here never block the core
  // dashboard, they just hide the relevant section.
  const [profile, setProfile] = useState(null);
  const [consistency, setConsistency] = useState(null);
  const [achievements, setAchievements] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // ── NEW: independent fetch for Profile-driven sections ────────────────────
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

  // ── NEW: first-name extracted from Profile, never hardcoded ───────────────
  const displayName = profile?.name?.trim()
    ? profile.name.trim().split(/\s+/)[0]
    : "";

  const stats = [
    {
      icon: <Dumbbell size={18} />,
      title: "Total Workouts",
      value: analytics.total_workouts,
      subtitle: "Completed",
      trend: dc.total_workouts ?? null,
      iconColor: "icon-indigo",
    },
    {
      icon: <Activity size={18} />,
      title: "Total Reps",
      value: analytics.total_reps,
      subtitle: "All Exercises",
      trend: dc.total_reps ?? null,
      iconColor: "icon-violet",
    },
    {
      icon: <Target size={18} />,
      title: "Form Score",
      value: `${analytics.avg_form_score}%`,
      subtitle: "Average",
      trend: dc.avg_form_score ?? null,
      iconColor: "icon-cyan",
    },
    {
      icon: <Footprints size={18} />,
      title: "Steps",
      value: analytics.total_steps?.toLocaleString(),
      subtitle: "Tracked",
      trend: dc.total_steps ?? null,
      iconColor: "icon-emerald",
    },
    {
      icon: <Moon size={18} />,
      title: "Sleep",
      value: `${analytics.avg_sleep}h`,
      subtitle: "Average",
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
                {/* ── UPDATED: personalized greeting, fetched from Profile ── */}
                Welcome Back{displayName ? `, ${displayName}` : ""}
              </motion.h1>

              <motion.p
                className="hero-subtext"
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={2}
              >
                {/* ── UPDATED subheading copy ── */}
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
                <div className="hero-pill">
                  <span className="pill-dot dot-green" />
                  <span>{analytics.total_workouts} workouts this week</span>
                </div>
                <div className="hero-pill">
                  <span className="pill-dot dot-indigo" />
                  <span>{analytics.avg_form_score}% avg form score</span>
                </div>
                <div className="hero-pill">
                  <span className="pill-dot dot-cyan" />
                  <span>{analytics.total_steps?.toLocaleString()} steps</span>
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
