// src/components/dashboard/AchievementsPanel.jsx
/*
==================================================
AI Gym & Fitness Assistant

File: AchievementsPanel.jsx

Purpose:
Displays user achievements and unlocked
fitness milestones.

Functionality:
- Displays achievement cards.
- Displays unlock progress.
- Displays achievement status.
- Displays achievement icons.
- Supports responsive layouts.

UI Features:
Achievement tracking
Progress indicators
Milestone visualization

Used By:
Dashboard page
AI Achievement System

==================================================
*/
import { motion } from "framer-motion";
import {
  Dumbbell,
  Droplets,
  Moon,
  Flame,
  Award,
  Medal,
  Utensils,
  BookOpen,
  Footprints,
  Sparkles,
  Lock,
} from "lucide-react";

const ICON_MAP = {
  Dumbbell,
  Droplets,
  Moon,
  Flame,
  Award,
  Medal,
  Utensils,
  BookOpen,
  Footprints,
  Sparkles,
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut", delay: i * 0.04 },
  }),
};

function AchievementBadge({ achievement, index }) {
  const Icon = ICON_MAP[achievement.icon] || Award;
  const { unlocked, progress_current, progress_target } = achievement;
  const pct = Math.min(
    100,
    Math.round((progress_current / progress_target) * 100),
  );

  return (
    <motion.div
      className="action-card"
      variants={fadeUp}
      custom={index}
      initial="hidden"
      animate="visible"
      style={{ opacity: unlocked ? 1 : 0.55, cursor: "default" }}
    >
      <div className="action-icon">
        {unlocked ? <Icon size={18} /> : <Lock size={18} />}
      </div>
      <div className="action-text">
        <p className="action-title">{achievement.title}</p>
        <p className="action-desc">
          {unlocked
            ? achievement.description
            : `${progress_current}/${progress_target} — ${pct}%`}
        </p>
      </div>
    </motion.div>
  );
}

export default function AchievementsPanel({ data }) {
  if (!data) return null;

  return (
    <div className="panel-card">
      <div className="panel-header">
        <h3 className="panel-title">Achievements</h3>
        <p className="panel-subtitle">
          {data.unlocked_count} of {data.total_count} unlocked
        </p>
      </div>
      <div className="quick-actions-grid">
        {data.achievements.map((a, i) => (
          <AchievementBadge key={a.key} achievement={a} index={i} />
        ))}
      </div>
    </div>
  );
}
