// src/components/common/WellnessScoreWidget.jsx
/*
==================================================
AI Gym & Fitness Assistant

File: WellnessScoreWidget.jsx

Purpose:
Displays the user's overall AI Wellness
Score and health status.

Functionality:
- Displays the wellness score.
- Displays health status labels.
- Displays score progress.
- Displays personalized insights.
- Supports responsive layouts.

UI Features:
Wellness score card
Health indicators
Progress visualization

Used By:
Dashboard page
AI Wellness Score module

==================================================
*/
import { motion } from "framer-motion";

export default function WellnessScoreWidget({ score = 0, streak = 0 }) {
  let label = "Poor";
  let color = "#6B7280";

  if (score >= 90) {
    label = "Excellent";
    color = "#10B981";
  } else if (score >= 75) {
    label = "Good";
    color = "#2563EB";
  } else if (score >= 60) {
    label = "Fair";
    color = "#F59E0B";
  } else if (score >= 45) {
    label = "Needs Work";
    color = "#EF4444";
  }

  const radius = 70;

  const circumference = 2 * Math.PI * radius;

  const offset = circumference - (score / 100) * circumference;

  return (
    <motion.div
      className="wellness-widget"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="wellness-title">AI Wellness Score</h3>

      <svg width="190" height="190" viewBox="0 0 190 190">
        <circle
          cx="95"
          cy="95"
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="14"
        />

        <circle
          cx="95"
          cy="95"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 95 95)"
        />

        <text
          x="95"
          y="92"
          textAnchor="middle"
          fontSize="32"
          fontWeight="700"
          fill={color}
        >
          {score}
        </text>

        <text x="95" y="116" textAnchor="middle" fontSize="12" fill="#6B7280">
          out of 100
        </text>
      </svg>

      <p
        style={{
          color,
          fontWeight: 700,
          fontSize: "18px",
        }}
      >
        {label}
      </p>

      <p>🔥 {streak} Day Streak</p>
    </motion.div>
  );
}
