// src/components/dashboard/ConsistencyTracker.jsx
/*
==================================================
AI Gym & Fitness Assistant

File: ConsistencyTracker.jsx

Purpose:
Displays user consistency metrics and
fitness streak statistics.

Functionality:
- Displays current streaks.
- Displays longest streaks.
- Displays weekly consistency.
- Displays monthly consistency.
- Displays successful day counts.
- Supports responsive layouts.

UI Features:
Consistency tracking
Streak visualization
Progress indicators

Used By:
Dashboard page
AI Consistency Tracker

==================================================
*/
import { motion } from "framer-motion";
import { Flame, TrendingUp, CalendarClock, CheckCircle2 } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut", delay: i * 0.06 },
  }),
};

function ConsistencyStat({ icon, label, value, index }) {
  return (
    <motion.div
      className="stat-card"
      variants={fadeUp}
      custom={index}
      initial="hidden"
      animate="visible"
    >
      <div className="stat-icon-wrap icon-indigo">{icon}</div>
      <div className="stat-body">
        <p className="stat-title">{label}</p>
        <p className="stat-value">{value}</p>
      </div>
    </motion.div>
  );
}

export default function ConsistencyTracker({ data }) {
  if (!data) return null;

  const stats = [
    {
      icon: <Flame size={18} />,
      label: "Current Streak",
      value: `${data.current_streak} ${data.current_streak === 1 ? "Day" : "Days"}`,
    },
    {
      icon: <TrendingUp size={18} />,
      label: "Longest Streak",
      value: `${data.longest_streak} ${data.longest_streak === 1 ? "Day" : "Days"}`,
    },
    {
      icon: <CalendarClock size={18} />,
      label: "Weekly Consistency",
      value: `${data.weekly_consistency_pct}%`,
    },
    {
      icon: <CheckCircle2 size={18} />,
      label: "Monthly Consistency",
      value: `${data.monthly_consistency_pct}%`,
    },
  ];

  return (
    <section className="stats-section">
      <div className="panel-header" style={{ marginBottom: "0.75rem" }}>
        <h3 className="panel-title">Consistency Tracker</h3>
        <p className="panel-subtitle">
          {data.successful_days} successful days logged
          {data.using_profile_targets ? " · using your Profile targets" : ""}
        </p>
      </div>
      <div className="stats-grid">
        {stats.map((s, i) => (
          <ConsistencyStat key={s.label} {...s} index={i} />
        ))}
      </div>
    </section>
  );
}
