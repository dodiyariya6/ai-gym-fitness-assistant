// src/components/ProtectedRoute.jsx
/*
==================================================
AI Gym & Fitness Assistant

File: ProtectedRoute.jsx

Purpose:
Protects authenticated pages from
unauthorized access.

Functionality:
- Checks JWT token availability.
- Restricts access to protected routes.
- Redirects unauthenticated users.
- Preserves secure navigation.

UI Features:
Route protection
Access control
Automatic redirection

Used By:
Dashboard page
Dietician page
Fitness Chat page
Habits page
Workout page
Webcam page
Reports page
Profile page
Gym Finder page

==================================================
*/
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return children;
}
