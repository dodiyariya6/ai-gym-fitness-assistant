// src/components/charts/WorkoutChart.jsx
/*
==================================================
AI Gym & Fitness Assistant

File: WorkoutChart.jsx

Purpose:
Displays workout trend analytics using
a responsive line chart.

Functionality:
- Visualizes workout trends over time.
- Displays workout counts by day.
- Supports responsive layouts.
- Shows interactive tooltips.
- Handles empty datasets gracefully.

Responsibilities:
Workout visualization
Trend analysis
Chart rendering
Data presentation

Used By:
Dashboard page
Analytics Dashboard

==================================================
*/
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function WorkoutChart({ data = [] }) {
  if (!data.length) return null;

  return (
    <div className="chart-card">
      <h3 className="chart-title">Workout Trend</h3>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />

          <XAxis
            dataKey="day"
            tick={{ fill: "var(--text-secondary)" }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            allowDecimals={false}
            tick={{ fill: "var(--text-secondary)" }}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip
            contentStyle={{
              borderRadius: "16px",
              border: "1px solid var(--border)",
              background: "#fff",
              boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            }}
          />

          <Line
            type="monotone"
            dataKey="workouts"
            stroke="var(--accent-700)"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
