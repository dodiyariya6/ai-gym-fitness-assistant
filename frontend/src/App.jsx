// src/App.jsx
/*
==================================================
AI Gym & Fitness Assistant

File: App.jsx

Purpose:
Acts as the root component of the
frontend application.

Functionality:
- Loads application routes.
- Initializes page rendering.
- Serves as the frontend entry point.

Responsibilities:
Application initialization
Route loading

Used By:
main.jsx
Entire frontend application

==================================================
*/
import AppRoutes from "./routes/AppRoutes";

function App() {
  return <AppRoutes />;
}

export default App;
