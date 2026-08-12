// src/components/ProtectedRoute.jsx
/*
==================================================
IFA — Intelligent Fitness Assistant

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
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}
