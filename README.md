# AI Gym & Fitness Assistant

> AI-powered full-stack fitness platform that combines workout tracking, computer vision exercise analysis, personalized nutrition planning, habit monitoring, and intelligent fitness assistance into one unified ecosystem.

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Gemini_AI-4285F4?style=for-the-badge&logo=google&logoColor=white)
![MediaPipe](https://img.shields.io/badge/MediaPipe-00897B?style=for-the-badge&logo=google&logoColor=white)

---

## Features

| Feature             | Description                                                            |
| ------------------- | ---------------------------------------------------------------------- |
| JWT Authentication  | Secure registration, login, and protected route access                 |
| AI Webcam Trainer   | Real-time pose detection and rep counting via MediaPipe                |
| Workout Tracker     | Manual exercise logging with automatic MET-based calorie calculation   |
| AI Dietician        | Personalized meal plans via Gemini, based on BMI, BMR, and TDEE        |
| Habit Tracker       | Daily logging of water, sleep, steps, and workout completion           |
| Wellness Score      | Unified health score derived from habits, form data, and consistency   |
| Consistency Tracker | Streak tracking, weekly and monthly discipline metrics                 |
| Achievement System  | Auto-unlocked milestone badges to gamify progress                      |
| Reports             | Performance summaries with Gemini-generated actionable suggestions     |
| Gym Finder          | Nearby gym discovery via OpenStreetMap and the Overpass API            |
| AI Fitness Chatbot  | Gemini-powered virtual gym buddy for personalized guidance             |
| Dashboard           | Live analytics and trend indicators sourced entirely from the database |

---

## Tech Stack

### Frontend

| Technology       | Role                                        |
| ---------------- | ------------------------------------------- |
| React + Vite     | UI framework and build tooling              |
| React Router DOM | Client-side navigation and protected routes |
| Recharts         | Data visualization and analytics charts     |
| CSS              | Styling and responsive layout               |

### Backend

| Technology | Role                                |
| ---------- | ----------------------------------- |
| FastAPI    | REST API development                |
| SQLAlchemy | ORM and database management         |
| Python     | Core business logic                 |
| JWT        | Authentication and session security |

### Database

| Technology      | Role                                                      |
| --------------- | --------------------------------------------------------- |
| Neon PostgreSQL | Cloud-hosted relational database — single source of truth |

### AI Services

| Technology        | Role                                           |
| ----------------- | ---------------------------------------------- |
| Google Gemini API | Meal planning, fitness chatbot, AI suggestions |
| MediaPipe         | Human pose estimation and exercise analysis    |

---

## System Architecture

```
User
  |
  v
React Frontend  (Vite, JSX, Recharts)
  |
  v
FastAPI Backend  (Python, SQLAlchemy)
  |
  v
Neon PostgreSQL  (Single Source of Truth)
  |
  v
AI Services
  |-- Google Gemini API   Meal Plans, Chatbot, Suggestions
  |-- MediaPipe           Real-Time Pose Detection
  |-- MET Formula Engine  Calorie Calculation
```

---

## Modules

### Authentication

Handles user registration, login, and access control. Passwords are hashed with Bcrypt. JWT tokens secure every protected route across the application.

---

### Dashboard

Displays a real-time overview of total workouts, calories burned, weekly goal progress, health score, and habit trends. All values are fetched live from the database — no hardcoded data.

---

### Profile

The single source of truth for personalization. Stores personal info, location, fitness goals, and activity level. Generates daily targets for water, sleep, steps, and calories. Feeds data directly into the Dietician, Habit Tracker, Reports, and Gym Finder modules.

---

### AI Dietician

Calculates BMI, BMR (Mifflin-St Jeor), and TDEE from profile data, then calls Google Gemini to generate a personalized five-meal plan with macronutrient targets and a grocery list.

---

### Workout Tracker

Records exercise name, sets, reps, duration, and date. Calories are automatically estimated using the MET formula against the user's body weight. Full workout history is maintained per user.

---

### AI Webcam Trainer

The core computer vision module. Uses MediaPipe Pose Detection to track body landmarks in real time, count repetitions via joint angle analysis, and display a live skeleton overlay with form feedback. Supports Squats, Bicep Curls, Pushups, Lunges, and Jumping Jacks.

---

### Pose Analyzer

Scores exercise quality from webcam sessions on a 50–100 scale. Scores feed into the Wellness Score and Reports modules.

| Range    | Category          |
| -------- | ----------------- |
| 90 – 100 | Excellent         |
| 80 – 89  | Good              |
| 70 – 79  | Fair              |
| 60 – 69  | Needs Improvement |
| 50 – 59  | Poor              |

---

### Habit Tracker

Logs daily water intake, sleep hours, steps, and workout completion. Prevents duplicate entries, allows past-date logging, and restricts future dates. Displays a weekly habit matrix and full history timeline.

---

### Virtual Gym Buddy

A Gemini-powered fitness chatbot. Responds to questions about workouts, diet, goals, and healthy habits with personalized, context-aware answers.

---

### Reports

Aggregates health score, form score, average sleep and water intake, step totals, and workout statistics into a weekly summary. Gemini generates actionable improvement suggestions from the user's data.

---

### Wellness Score

Computes a single unified health score from water intake, sleep, steps, workout completion, form score, and habit consistency. Gives users a quick, honest picture of their overall health.

---

### Consistency Tracker

Tracks current streak, longest streak, total successful days, and weekly and monthly consistency percentages. Designed to build long-term discipline through visible progress.

---

### Achievement System

Automatically awards badges when users hit milestones: First Workout, Hydration Hero, Sleep Champion, Weekly Warrior, Goal Crusher, Habit Builder, Step Master, and AI Explorer.

---

### Gym Finder

Detects the user's location from their profile and discovers nearby fitness centers using OpenStreetMap, Nominatim, and the Overpass API. Provides an adjustable search radius and direct Google Maps directions.

---

## Project Workflow

```
Register / Login
  |
  v
Complete Profile  (goals, activity level, location)
  |
  v
Daily Activity
  |-- Log Habits    (water, sleep, steps)
  |-- Log Workout   (manual entry)
  |-- Webcam        (AI pose detection + rep counting)
  |
  v
PostgreSQL  (all data persisted)
  |
  v
Dashboard   (live metrics + trends)
  |
  v
Reports     (weekly summary + AI suggestions)
  |
  v
Analytics   (scores, achievements, streaks)
```

---

## Project Statistics

| Metric              | Value                  |
| ------------------- | ---------------------- |
| Total Modules       | 14                     |
| Application Pages   | 10+                    |
| AI Integrations     | 3                      |
| Supported Exercises | 5                      |
| Authentication      | JWT                    |
| Database            | Neon PostgreSQL        |
| Deployment Stack    | Vercel + Render + Neon |

---

## Screenshots

**Dashboard**

![Dashboard](screenshots/dashboard.png)

**AI Webcam Trainer**

![Webcam Trainer](screenshots/webcam.png)

**Workout History**

![Workout History](screenshots/workout-history.png)

**AI Dietician**

![Dietician](screenshots/dietician.png)

**Habit Tracker**

![Habit Tracker](screenshots/habits.png)

**Reports**

![Reports](screenshots/reports.png)

---

## Installation

### Prerequisites

- Node.js 18+
- Python 3.10+
- Neon PostgreSQL connection string
- Google Gemini API key

### Clone

```bash
git clone https://github.com/your-username/AI-Gym-Fitness-Assistant.git
cd AI-Gym-Fitness-Assistant
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API available at `http://127.0.0.1:8000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App available at `http://localhost:5173`

---

## Environment Variables

**Backend** — `backend/.env`

```env
DATABASE_URL=postgresql://user:password@host/dbname
SECRET_KEY=your_jwt_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
GEMINI_API_KEY=your_google_gemini_api_key
```

**Frontend** — `frontend/.env`

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

---

## Folder Structure

```
AI-Gym-Fitness-Assistant/
|
|-- backend/
|   |-- app/
|   |   |-- models/
|   |   |   |-- user.py
|   |   |   |-- workout.py
|   |   |   |-- habit.py
|   |   |   |-- profile.py
|   |   |   |-- meal_plan.py
|   |   |
|   |   |-- routers/
|   |   |   |-- auth.py
|   |   |   |-- workout.py
|   |   |   |-- habit.py
|   |   |   |-- profile.py
|   |   |   |-- pose.py
|   |   |   |-- dietician.py
|   |   |   |-- reports.py
|   |   |
|   |   |-- services/
|   |   |   |-- auth_service.py
|   |   |   |-- workout_service.py
|   |   |   |-- habit_service.py
|   |   |   |-- pose_service.py
|   |   |   |-- squat_service.py
|   |   |   |-- curl_service.py
|   |   |   |-- pushup_service.py
|   |   |   |-- lunge_service.py
|   |   |   |-- jumping_jack_service.py
|   |   |
|   |   |-- schemas/
|   |   |   |-- workout.py
|   |   |   |-- habit.py
|   |   |   |-- profile.py
|   |   |
|   |   |-- database.py
|   |   |-- main.py
|   |
|   |-- requirements.txt
|
|-- frontend/
|   |-- src/
|   |   |-- pages/
|   |   |   |-- Dashboard.jsx
|   |   |   |-- Workout.jsx
|   |   |   |-- Webcam.jsx
|   |   |   |-- Habits.jsx
|   |   |   |-- Dietician.jsx
|   |   |   |-- Profile.jsx
|   |   |   |-- Reports.jsx
|   |   |   |-- GymFinder.jsx
|   |   |   |-- Chatbot.jsx
|   |   |   |-- Login.jsx
|   |   |   |-- Register.jsx
|   |   |
|   |   |-- components/
|   |   |-- layouts/
|   |   |-- services/
|   |   |   |-- api.js
|   |   |   |-- workoutService.js
|   |   |   |-- habitService.js
|   |   |   |-- profileService.js
|   |   |
|   |   |-- styles/
|   |
|   |-- index.html
|   |-- vite.config.js
|   |-- package.json
|
|-- README.md
```

---

## Future Improvements

- React Native mobile application for iOS and Android
- Wearable device integration for passive health tracking
- Voice assistant for hands-free workout guidance
- ML-based fitness prediction and goal timeline estimation
- Advanced posture analysis with injury risk detection

---

## Contributors

| Name        | Role                                                 |
| ----------- | ---------------------------------------------------- |
| [Your Name] | Full-Stack Development, AI Integration, Project Lead |

---

## License

Developed as a B.Tech Major Project for academic submission. For usage or collaboration inquiries, contact the contributor directly.
