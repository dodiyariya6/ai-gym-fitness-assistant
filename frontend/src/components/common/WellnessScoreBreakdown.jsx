// src/components/common/WellnessScoreBreakdown.jsx
/*
==================================================
AI Gym & Fitness Assistant

File: WellnessScoreBreakdown.jsx

Purpose:
Displays a detailed breakdown of the
AI Wellness Score calculation.

Functionality:
- Displays wellness score components.
- Displays metric contributions.
- Visualizes health indicators.
- Explains score calculations.
- Supports responsive layouts.

UI Features:
Score breakdown
Health insights
Progress indicators

Used By:
Dashboard page
AI Wellness Score module

==================================================
*/
export default function WellnessScoreBreakdown({ analytics }) {
  if (!analytics) return null;

  return (
    <div className="wellness-breakdown">
      <h3>AI Wellness Score</h3>

      <div className="breakdown-grid">
        <div>
          <span>Score</span>

          <strong>{analytics.health_score}</strong>
        </div>

        <div>
          <span>Sleep</span>

          <strong>{analytics.avg_sleep} hrs</strong>
        </div>

        <div>
          <span>Water</span>

          <strong>{analytics.avg_water} L</strong>
        </div>

        <div>
          <span>Steps</span>

          <strong>{analytics.total_steps.toLocaleString()}</strong>
        </div>

        <div>
          <span>Form Score</span>

          <strong>{analytics.avg_form_score}%</strong>
        </div>

        <div>
          <span>Streak</span>

          <strong>{analytics.current_streak}</strong>
        </div>
      </div>
    </div>
  );
}
