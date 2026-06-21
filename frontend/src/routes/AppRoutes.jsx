// src/routes/AppRoutes.jsx
/*
==================================================
AI Gym & Fitness Assistant

File: AppRoutes.jsx

Purpose:
Defines all application routes and
configures protected navigation.

Functionality:
- Registers application routes.
- Protects authenticated pages.
- Redirects unauthenticated users.
- Handles unknown routes.
- Configures page navigation.

Responsibilities:
Route management
Access control
Page navigation

Used By:
Entire frontend application

==================================================
*/
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import Dietician from "../pages/Dietician";
import FitnessChat from "../pages/FitnessChat";
import Habit from "../pages/Habits";
import Reports from "../pages/Reports";
import Workout from "../pages/Workout";
import Webcam from "../pages/Webcam";
import Profile from "../pages/Profile";
import GymFinder from "../pages/GymFinder"; // ← NEW
import ProtectedRoute from "../components/ProtectedRoute";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/diet"
          element={
            <ProtectedRoute>
              <Dietician />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <FitnessChat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/habits"
          element={
            <ProtectedRoute>
              <Habit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workout"
          element={
            <ProtectedRoute>
              <Workout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/webcam"
          element={
            <ProtectedRoute>
              <Webcam />
            </ProtectedRoute>
          }
        />

        {/* ── NEW ── */}
        <Route
          path="/gym-finder"
          element={
            <ProtectedRoute>
              <GymFinder />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
