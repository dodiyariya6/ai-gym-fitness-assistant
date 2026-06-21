// src/components/common/StatCard.jsx
/*
==================================================
AI Gym & Fitness Assistant

File: StatCard.jsx

Purpose:
Displays individual dashboard statistics
and key performance indicators.

Functionality:
- Displays analytics values.
- Displays metric titles.
- Displays trend indicators.
- Displays icons.
- Supports responsive layouts.

UI Features:
Statistics cards
Trend visualization
Icon support

Used By:
Dashboard page

==================================================
*/
export default function StatCard({
  icon,

  title,

  value,

  subtitle,
}) {
  return (
    <div className="stat-card" role="article">
      <div className="stat-icon">{icon}</div>

      <p className="stat-title">{title}</p>

      <h2 className="stat-value">{value}</h2>

      {subtitle && <span className="stat-subtitle">{subtitle}</span>}
    </div>
  );
}
