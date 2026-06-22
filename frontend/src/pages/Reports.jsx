// src/pages/Reports.jsx
/*
==================================================
AI Gym & Fitness Assistant

File: Reports.jsx

Purpose:
Displays analytics, wellness reports,
and AI-generated fitness insights.

Functionality:
- Displays fitness KPIs.
- Displays wellness scores.
- Displays health insights.
- Displays performance summaries.
- Displays AI suggestions.
- Displays trend indicators.
- Handles loading and error states.
- Supports responsive layouts.

Responsibilities:
Analytics visualization
Progress reporting
Insight generation
Health monitoring

Used By:
Reports page

==================================================
*/
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import {
  Activity,
  Dumbbell,
  Footprints,
  Moon,
  Droplets,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Heart,
  Award,
  RefreshCw,
  BarChart2,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout";
import { getAnalytics } from "../services/analyticsService";
import WellnessScoreBreakdown from "../components/common/WellnessScoreBreakdown";
import "../styles/reports.css";

/* ── Animation Variants ─────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: i * 0.07, ease: "easeOut" },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: (i = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, delay: i * 0.06, ease: "easeOut" },
  }),
};

/* ── TrendIcon ──────────────────────────────────────
   Accepts direction: "up" | "down" | "neutral" | null
   Renders nothing when null (no previous entry exists).
   Never shows percentages — backend does not calculate deltas.
────────────────────────────────────────────────── */
function TrendIcon({ direction }) {
  if (!direction) return null;
  if (direction === "up")
    return <TrendingUp size={14} className="trend-icon trend-up" />;
  if (direction === "down")
    return <TrendingDown size={14} className="trend-icon trend-down" />;
  return <Minus size={14} className="trend-icon trend-neutral" />;
}

/* ── StatusBadge ────────────────────────────────── */
function StatusBadge({ status }) {
  const map = {
    Excellent: { cls: "badge-success", icon: <CheckCircle2 size={12} /> },
    Good: { cls: "badge-info", icon: <CheckCircle2 size={12} /> },
    Achieved: { cls: "badge-success", icon: <CheckCircle2 size={12} /> },
    Healthy: { cls: "badge-success", icon: <CheckCircle2 size={12} /> },
    Beginner: { cls: "badge-warning", icon: <Info size={12} /> },
    Pending: { cls: "badge-warning", icon: <AlertCircle size={12} /> },
    "Needs Improvement": {
      cls: "badge-danger",
      icon: <AlertCircle size={12} />,
    },
  };
  const config = map[status] || { cls: "badge-info", icon: <Info size={12} /> };
  return (
    <span className={`status-badge ${config.cls}`}>
      {config.icon}
      {status}
    </span>
  );
}

/* ── ProgressRing ───────────────────────────────── */
function ProgressRing({ value, size = 80, stroke = 5, color = "#6366F1" }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} className="progress-ring">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#E5E7EB"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

/* ── KpiCard ────────────────────────────────────── */
function KpiCard({
  icon: Icon,
  label,
  value,
  unit,
  trend,
  color,
  ring,
  index,
}) {
  return (
    <motion.div
      className="kpi-card"
      variants={scaleIn}
      custom={index}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -4, boxShadow: "0 16px 40px rgba(0,0,0,0.10)" }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="kpi-top">
        <div className="kpi-icon-wrap" style={{ background: `${color}18` }}>
          <Icon size={18} style={{ color }} />
        </div>
        <TrendIcon direction={trend} />
      </div>

      <div className="kpi-body">
        {ring !== undefined && ring !== null ? (
          <div className="kpi-ring-wrap">
            <ProgressRing value={ring} color={color} />
            <span className="kpi-ring-val">{ring}%</span>
          </div>
        ) : (
          <p className="kpi-value">
            {value}
            {unit && <span className="kpi-unit">{unit}</span>}
          </p>
        )}
        <span className="kpi-label">{label}</span>
      </div>
    </motion.div>
  );
}

/* ── InsightRow ─────────────────────────────────── */
function InsightRow({ label, value, status, icon: Icon, color }) {
  return (
    <div className="insight-row">
      <div className="insight-left">
        <div className="insight-icon-wrap" style={{ background: `${color}15` }}>
          <Icon size={15} style={{ color }} />
        </div>
        <span className="insight-label">{label}</span>
      </div>
      <div className="insight-right">
        <span className="insight-value">{value}</span>
        <StatusBadge status={status} />
      </div>
    </div>
  );
}

/* ── SuggestionItem ─────────────────────────────── */
function SuggestionItem({ text, index }) {
  return (
    <motion.div
      className="suggestion-item"
      variants={fadeUp}
      custom={index}
      initial="hidden"
      animate="visible"
    >
      <div className="suggestion-dot" />
      <p className="suggestion-text">{text}</p>
    </motion.div>
  );
}

/* ── Main Component ─────────────────────────────── */
export default function Reports() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // BUG FIX: useLocation() lets us detect when the user navigates back to
  // this route via client-side routing (e.g. clicking the sidebar link).
  // React Router does NOT unmount/remount the component on revisit, so
  // useEffect([]) only ran once — on the very first visit — and stale
  // (or empty) analytics were shown on every subsequent visit.
  const location = useLocation();

  // BUG FIX: location.pathname added to the dependency array so the fetch
  // runs every time the Reports route is activated, not just on initial mount.
  useEffect(() => {
    fetchAnalytics();
  }, [location.pathname]);

  const fetchAnalytics = async () => {
    try {
      // BUG FIX: Reset to loading state before each fetch so that stale
      // analytics data is never displayed while the request is in flight.
      // Previously, analytics stayed set to the old value during a refresh,
      // which could briefly show zeros if the previous response had null fields.
      setLoading(true);
      setError("");
      setAnalytics(null);

      const data = await getAnalytics();
      if (!data) throw new Error("Invalid analytics response");
      setAnalytics(data);
    } catch (err) {
      console.error("Reports Error:", err);
      setError("Unable to load reports. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <DashboardLayout>
        <div className="reports-state-wrap">
          <motion.div
            className="reports-loading"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="loading-spinner">
              <RefreshCw size={22} className="spin-icon" />
            </div>
            <p>Loading your analytics…</p>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <DashboardLayout>
        <div className="reports-state-wrap">
          <motion.div
            className="reports-error"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertCircle size={32} className="error-icon" />
            <p>{error}</p>
            <button
              type="button"
              className="btn-retry"
              onClick={fetchAnalytics}
            >
              Try Again
            </button>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  /* ── Empty ── */
  if (!analytics) {
    return (
      <DashboardLayout>
        <div className="reports-state-wrap">
          <motion.div
            className="reports-empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <BarChart2 size={40} className="empty-icon" />
            <p>
              No analytics available yet. Complete a workout to get started.
            </p>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  // ── All values come from backend ────────────────────────────────────────────

  // health_score is calculated by the backend — not derived here.
  const healthScore = analytics.health_score ?? 0;

  // daily_comparison provides all trend directions — no fabricated values.
  const dc = analytics.daily_comparison ?? {};

  // ai_suggestions are generated by the backend from real data — not hardcoded.
  const suggestions = analytics.ai_suggestions ?? [];

  // BUG FIX: Read overall_avg_daily_steps directly from the analytics response.
  // Previously ?? 0 masked null/undefined, causing "0" to display even when
  // the backend had calculated a valid average from 15 habit records.
  // Using ?? null here lets us display "—" instead of a misleading zero.
  const overallAvgDailySteps = analytics.overall_avg_daily_steps ?? null;

  // Status labels derived from actual metric values (thresholds only, no numbers invented).
  // BUG FIX: Guard against null before comparing numeric values.
  const hydrationStatus =
    analytics.avg_water != null
      ? analytics.avg_water >= 2
        ? "Excellent"
        : "Needs Improvement"
      : null;

  const sleepStatus =
    analytics.avg_sleep != null
      ? analytics.avg_sleep >= 7
        ? "Healthy"
        : "Needs Improvement"
      : null;

  // BUG FIX: compare overall average daily steps against a daily target (6000).
  // Guard against null so we don't compare null >= 6000 (which returns false
  // and would incorrectly show "Pending" even when data is simply unavailable).
  const stepsGoal =
    overallAvgDailySteps !== null
      ? overallAvgDailySteps >= 6000
        ? "Achieved"
        : "Pending"
      : null;

  const fitnessLevel =
    healthScore >= 85 ? "Excellent" : healthScore >= 70 ? "Good" : "Beginner";

  const scoreColor =
    healthScore >= 85 ? "#10B981" : healthScore >= 70 ? "#6366F1" : "#F59E0B";

  // Helper: display a numeric value or "—" when the backend returned null.
  const fmt = (v, suffix = "") =>
    v !== null && v !== undefined ? `${v}${suffix}` : "—";

  // KPI trend directions come from backend daily_comparison — no hardcoded strings.
  const kpis = [
    {
      icon: Dumbbell,
      label: "Total Workouts",
      value: analytics.total_workouts ?? "—",
      color: "#6366F1",
      trend: dc.total_workouts ?? null,
    },
    {
      icon: Activity,
      label: "Total Reps",
      value: analytics.total_reps ?? "—",
      color: "#8B5CF6",
      trend: dc.total_reps ?? null,
    },
    {
      // Displays the mean across every habit log ever recorded.
      // BUG FIX: null guard prevents toLocaleString() throwing on null,
      // and shows "—" instead of "0" when the field is absent.
      icon: Footprints,
      label: "Average Overall Steps",
      value:
        overallAvgDailySteps !== null
          ? overallAvgDailySteps.toLocaleString()
          : "—",
      color: "#06B6D4",
      trend: dc.total_steps ?? null,
    },
    {
      icon: Moon,
      label: "Avg Sleep",
      value: analytics.avg_sleep ?? "—",
      unit: analytics.avg_sleep != null ? " hrs" : "",
      color: "#8B5CF6",
      trend: dc.avg_sleep ?? null,
    },
    {
      icon: Droplets,
      label: "Water Intake",
      value: analytics.avg_water ?? "—",
      unit: analytics.avg_water != null ? " L" : "",
      color: "#06B6D4",
      trend: dc.avg_water ?? null,
    },
    {
      icon: Target,
      label: "Form Score",
      // BUG FIX: pass null explicitly when avg_form_score is absent so
      // KpiCard falls back to the value display rather than rendering an
      // empty ring at 0%.
      ring: analytics.avg_form_score ?? null,
      color: "#10B981",
      trend: dc.avg_form_score ?? null,
    },
  ];

  return (
    <DashboardLayout>
      <div className="reports-page">
        {/* ── HERO ── */}
        <motion.section
          className="reports-hero"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <div className="hero-blob hero-blob-1" />
          <div className="hero-blob hero-blob-2" />

          <div className="hero-content">
            <div className="hero-text">
              <motion.div
                className="hero-eyebrow"
                variants={fadeUp}
                custom={0}
                initial="hidden"
                animate="visible"
              >
                <BarChart2 size={14} />
                Wellness Analytics
              </motion.div>

              <motion.h1
                className="hero-title"
                variants={fadeUp}
                custom={1}
                initial="hidden"
                animate="visible"
              >
                Your Progress,
                <br />
                <span className="hero-title-accent">Clearly Understood</span>
              </motion.h1>

              <motion.p
                className="hero-subtitle"
                variants={fadeUp}
                custom={2}
                initial="hidden"
                animate="visible"
              >
                Track long-term trends, surface insights, and stay motivated
                with a complete view of your health journey.
              </motion.p>

              <motion.div
                className="hero-pills"
                variants={fadeUp}
                custom={3}
                initial="hidden"
                animate="visible"
              >
                <span className="hero-pill pill-primary">
                  <Zap size={12} />
                  {analytics.total_workouts ?? "—"} Workouts Logged
                </span>
                <span className="hero-pill pill-secondary">
                  <Heart size={12} />
                  Health Score {healthScore}%
                </span>
                <span className="hero-pill pill-accent">
                  <Award size={12} />
                  {fitnessLevel} Level
                </span>
              </motion.div>
            </div>

            {/* Health Score Ring — value from backend */}
            <motion.div
              className="hero-score-ring"
              variants={scaleIn}
              custom={2}
              initial="hidden"
              animate="visible"
            >
              <div className="score-ring-wrap">
                <ProgressRing
                  value={healthScore}
                  size={148}
                  stroke={10}
                  color={scoreColor}
                />
                <div className="score-ring-inner">
                  <span className="score-ring-val">{healthScore}</span>
                  <span className="score-ring-label">Health Score</span>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* ── KPI CARDS ── */}
        <motion.section
          className="reports-section"
          variants={fadeUp}
          custom={1}
          initial="hidden"
          animate="visible"
        >
          <div className="section-header">
            <h2 className="section-title">Key Metrics</h2>
            <p className="section-subtitle">Your fitness numbers at a glance</p>
          </div>

          <div className="kpi-grid">
            {kpis.map((kpi, i) => (
              <KpiCard key={kpi.label} {...kpi} index={i} />
            ))}
          </div>
        </motion.section>

        {/* ── BOTTOM GRID ── */}
        <div className="reports-bottom-grid">
          {/* Weekly Insights */}
          <motion.div
            className="analytics-card"
            variants={fadeUp}
            custom={0}
            initial="hidden"
            animate="visible"
          >
            <div className="analytics-card-header">
              <div
                className="analytics-card-icon-wrap"
                style={{ background: "#6366F115" }}
              >
                <TrendingUp size={16} style={{ color: "#6366F1" }} />
              </div>
              <div>
                <h3 className="analytics-card-title">Weekly Insights</h3>
                <p className="analytics-card-sub">Current period overview</p>
              </div>
            </div>

            <div className="insight-list">
              <InsightRow
                label="Workout Completion"
                value={fmt(analytics.workout_completion_rate, "%")}
                status={
                  analytics.workout_completion_rate >= 80
                    ? "Excellent"
                    : analytics.workout_completion_rate >= 60
                      ? "Good"
                      : "Needs Improvement"
                }
                icon={Dumbbell}
                color="#6366F1"
              />
              <InsightRow
                label="Fitness Health Score"
                value={`${healthScore}%`}
                status={fitnessLevel}
                icon={Heart}
                color="#EF4444"
              />
              <InsightRow
                label="Average Sleep"
                value={fmt(analytics.avg_sleep, " hrs")}
                status={sleepStatus ?? "Pending"}
                icon={Moon}
                color="#8B5CF6"
              />
              <InsightRow
                label="Average Water"
                value={fmt(analytics.avg_water, " L")}
                status={hydrationStatus ?? "Pending"}
                icon={Droplets}
                color="#06B6D4"
              />
            </div>
          </motion.div>

          {/* Performance Summary */}
          <motion.div
            className="analytics-card"
            variants={fadeUp}
            custom={1}
            initial="hidden"
            animate="visible"
          >
            <div className="analytics-card-header">
              <div
                className="analytics-card-icon-wrap"
                style={{ background: "#10B98115" }}
              >
                <Award size={16} style={{ color: "#10B981" }} />
              </div>
              <div>
                <h3 className="analytics-card-title">Performance Summary</h3>
                <p className="analytics-card-sub">Where you stand right now</p>
              </div>
            </div>

            <div className="insight-list">
              <InsightRow
                label="Fitness Level"
                value={fitnessLevel}
                status={fitnessLevel}
                icon={Zap}
                color="#F59E0B"
              />
              <InsightRow
                label="Hydration"
                value={fmt(analytics.avg_water, " L / day")}
                status={hydrationStatus ?? "Pending"}
                icon={Droplets}
                color="#06B6D4"
              />
              <InsightRow
                label="Sleep Quality"
                value={fmt(analytics.avg_sleep, " hrs")}
                status={sleepStatus ?? "Pending"}
                icon={Moon}
                color="#8B5CF6"
              />
              <InsightRow
                label="Average Overall Steps"
                value={
                  overallAvgDailySteps !== null
                    ? overallAvgDailySteps.toLocaleString()
                    : "—"
                }
                status={stepsGoal ?? "Pending"}
                icon={Footprints}
                color="#6366F1"
              />
            </div>
          </motion.div>

          {/* AI Suggestions — rendered from backend data, never hardcoded */}
          <motion.div
            className="analytics-card suggestions-card"
            variants={fadeUp}
            custom={2}
            initial="hidden"
            animate="visible"
          >
            <div className="analytics-card-header">
              <div
                className="analytics-card-icon-wrap"
                style={{ background: "#8B5CF615" }}
              >
                <Zap size={16} style={{ color: "#8B5CF6" }} />
              </div>
              <div>
                <h3 className="analytics-card-title">AI Suggestions</h3>
                <p className="analytics-card-sub">
                  Personalised recommendations
                </p>
              </div>
            </div>

            <div className="suggestions-list">
              {suggestions.length > 0 ? (
                suggestions.map((s, i) => (
                  <SuggestionItem key={`suggestion-${i}`} text={s} index={i} />
                ))
              ) : (
                <p className="empty-state-text">
                  No suggestions available yet.
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
