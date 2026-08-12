// src/components/common/Navbar.jsx
/*
==================================================
IFA — Intelligent Fitness Assistant

File: Navbar.jsx

Purpose:
Displays the application's top navigation
bar and current date.

Functionality:
- Displays the application title.
- Displays the application tagline.
- Displays the current date.
- Provides entrance animations.
- Supports responsive layouts.

UI Features:
Application branding
Date display
Page header
Animated transitions

Used By:
Dashboard page
Main application layout

==================================================
*/
import { motion } from "framer-motion";

import { Calendar, Menu } from "lucide-react";

export default function Navbar({ onMenuToggle }) {
  const today = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <motion.header
      className="navbar"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.25,
        ease: "easeOut",
      }}
    >
      <div className="navbar-left">
        {/* Hidden on desktop, shown on mobile — see .navbar-menu-btn in navbar.css */}
        <button
          type="button"
          className="navbar-menu-btn"
          onClick={onMenuToggle}
          aria-label="Toggle navigation menu"
        >
          <Menu size={18} strokeWidth={1.8} />
        </button>

        <h2 className="navbar-title">IFA</h2>

        <p className="navbar-subtitle">Intelligent Fitness Assistant</p>
      </div>

      <div className="navbar-right">
        <div className="navbar-date" aria-label="Today's date">
          <Calendar size={13} strokeWidth={1.8} />

          <span>{today}</span>
        </div>
      </div>
    </motion.header>
  );
}
