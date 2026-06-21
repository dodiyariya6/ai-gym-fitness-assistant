// src/layouts/DashboardLayout.jsx
/*
==================================================
AI Gym & Fitness Assistant

File: DashboardLayout.jsx

Purpose:
Provides the shared application layout
for all authenticated pages.

Functionality:
- Renders the sidebar.
- Renders the navbar.
- Displays page content.
- Manages mobile sidebar state.
- Handles overlay interactions.
- Prevents background scrolling on mobile.

UI Features:
Application layout
Responsive navigation
Sidebar management

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
import { useState, useEffect } from "react";
import Sidebar from "../components/common/Sidebar";
import Navbar from "../components/common/Navbar";

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent body scroll when sidebar overlay is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <div className="layout">
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="content">
        <Navbar onMenuToggle={() => setSidebarOpen((prev) => !prev)} />

        <main className="page-content" aria-label="Main content">
          {children}
        </main>
      </div>
    </div>
  );
}
