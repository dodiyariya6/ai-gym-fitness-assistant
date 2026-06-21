// src/main.jsx
/*
==================================================
AI Gym & Fitness Assistant

File: main.jsx

Purpose:
Initializes the frontend application
and loads global styles.

Functionality:
- Mounts the React application.
- Renders the root component.
- Loads global CSS files.
- Loads page-specific styles.

Responsibilities:
Frontend initialization
Application rendering
Global style loading

Used By:
Entire frontend application

==================================================
*/
import ReactDOM from "react-dom/client";

import App from "./App";

import "./styles/globals.css";
import "./styles/layout.css";
import "./styles/sidebar.css";
import "./styles/dietician.css";
import "./styles/fitnessChat.css";
import "./styles/navbar.css";
import "./styles/dashboard.css";
import "./styles/habits.css";
import "./styles/reports.css";
import "./styles/workout.css";
import "./styles/responsive.css";
import "./styles/auth.css";
import "./styles/profile.css";

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
