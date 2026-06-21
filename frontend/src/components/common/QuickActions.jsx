// src/components/common/QuickActions.jsx
/*
==================================================
AI Gym & Fitness Assistant

File: QuickActions.jsx

Purpose:
Displays quick navigation shortcuts to
frequently used modules.

Functionality:
- Displays action cards.
- Enables fast navigation.
- Provides interactive buttons.
- Supports responsive layouts.
- Provides hover animations.

UI Features:
Quick navigation
Action shortcuts
Interactive cards

Used By:
Dashboard page

==================================================
*/
import { useNavigate } from "react-router-dom";

export default function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      title: "Generate Meal Plan",

      description: "Create an AI-powered diet plan.",

      route: "/diet",
    },

    {
      title: "Fitness Chat",

      description: "Ask fitness and nutrition questions.",

      route: "/chat",
    },

    {
      title: "Workout Tracker",

      description: "Log and manage workouts.",

      route: "/workout",
    },

    {
      title: "Habit Tracker",

      description: "Track sleep, water and steps.",

      route: "/habits",
    },

    {
      title: "AI Webcam Trainer",

      description: "Analyze exercise form in real time.",

      route: "/webcam",
    },

    {
      title: "Reports",

      description: "View overall performance insights.",

      route: "/reports",
    },
  ];

  return (
    <div className="quick-actions">
      <h3 className="section-title">Quick Actions</h3>

      <div className="quick-actions-grid">
        {actions.map((action) => (
          <button
            key={action.title}
            type="button"
            className="action-card"
            onClick={() => navigate(action.route)}
          >
            <h4>{action.title}</h4>

            <p>{action.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
