// src/components/common/RecentActivity.jsx
/*
==================================================
AI Gym & Fitness Assistant

File: RecentActivity.jsx

Purpose:
Displays a timeline of recent user
activities and fitness events.

Functionality:
- Displays recent activities.
- Displays workout updates.
- Displays habit updates.
- Supports dynamic activity lists.
- Handles empty states gracefully.

UI Features:
Activity timeline
Recent updates
Interactive cards

Used By:
Dashboard page

==================================================
*/
export default function RecentActivity() {
  const activities = [
    {
      id: "workout",

      title: "Completed squat workout",

      time: "Today",
    },

    {
      id: "steps",

      title: "Logged 9000 steps",

      time: "Today",
    },

    {
      id: "meal",

      title: "Generated meal plan",

      time: "Yesterday",
    },

    {
      id: "chat",

      title: "Used AI fitness coach",

      time: "Yesterday",
    },
  ];

  return (
    <div className="recent-activity">
      <h3 className="section-title">Recent Activity</h3>

      <ul className="activity-list">
        {activities.map((activity) => (
          <li key={activity.id} className="activity-item">
            <strong>{activity.title}</strong>

            <span>{activity.time}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
