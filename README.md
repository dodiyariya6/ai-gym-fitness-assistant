# AI Gym & Fitness Assistant

> > An AI-powered fitness assistant that combines workout tracking, computer vision, personalized nutrition planning, habit monitoring, and smart fitness guidance into one unified application.

![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=000000)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
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

### Gym Finder Services

| Technology    | Role              |
| ------------- | ----------------- |
| OpenStreetMap | Map provider      |
| Nominatim     | Geocoding         |
| Overpass API  | Nearby gym search |

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
AI Services                          Gym Finder Services
  |-- Google Gemini API                |-- OpenStreetMap
  |     Meal Plans, Chatbot,           |-- Nominatim
  |     Suggestions                    |-- Overpass API
  |-- MediaPipe
  |     Real-Time Pose Detection
  |-- MET Formula Engine
        Calorie Calculation
```

---

## Modules

### Authentication

Handles user registration, login, and access control. Passwords are hashed with Bcrypt. JWT tokens secure every protected route.

### Dashboard

Real-time overview of total workouts, calories burned, weekly goal progress, health score, and habit trends. All values are fetched live from the database.

### Profile

Single source of truth for personalization. Stores personal info, location, fitness goals, and activity level. Generates daily targets for water, sleep, steps, and calories. Feeds data into the Dietician, Habit Tracker, Reports, and Gym Finder modules.

### AI Dietician

Calculates BMI, BMR (Mifflin-St Jeor), and TDEE from profile data, then calls Gemini to generate a personalized five-meal plan with macronutrient targets and a grocery list.

### Workout Tracker

Records exercise name, sets, reps, duration, and date. Calories are estimated using the MET formula against the user's body weight. Full history is maintained per user.

### AI Webcam Trainer

Uses MediaPipe Pose Detection to track body landmarks in real time, count reps via joint angle analysis, and display a live skeleton overlay with form feedback. Supports Squats, Bicep Curls, Pushups, Lunges, and Jumping Jacks.

> ⚠️ **This feature runs locally only.**
> The Webcam AI Trainer uses OpenCV and MediaPipe with direct webcam access (`cv2.VideoCapture`). Cloud deployment platforms such as Render do not expose physical camera devices, so this module is demonstrated locally while all other modules are fully deployed online.

### Why it is local-only

Cloud servers (Render, Railway, Heroku) are headless Linux containers — they have no webcam, no screen, and no display driver. OpenCV's `VideoCapture(0)` and `imshow()` both require physical hardware. This is an architectural constraint, not a bug.

### Running the Webcam Trainer locally

**Step 1 — Clone and set up the backend**

```bash
git clone https://github.com/your-username/AI-Gym-Fitness-Assistant.git
cd AI-Gym-Fitness-Assistant/backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install opencv-python mediapipe
uvicorn app.main:app --reload
```

**Step 2 — Allow camera access**

Make sure your system allows Python to access the webcam. On macOS, grant Terminal camera permission under System Settings → Privacy & Security → Camera.

**Step 3 — Start a session**

Navigate to the Webcam Trainer page in the app and select an exercise. A separate OpenCV window will open with your camera feed, skeleton overlay, rep count, joint angle, and form feedback displayed in real time.

Press `Q` to end the session. Your rep count, duration, calories burned, and form score will be saved and reflected in your Dashboard, Reports, and Wellness Score.

### Supported exercises

| Exercise      | Joints tracked         |
| ------------- | ---------------------- |
| Squats        | Hip, knee, ankle       |
| Bicep Curls   | Shoulder, elbow, wrist |
| Pushups       | Shoulder, elbow, wrist |
| Lunges        | Hip, knee, ankle       |
| Jumping Jacks | Shoulder, hip, ankle   |

### Form score scale

| Score    | Rating            |
| -------- | ----------------- |
| 90 – 100 | Excellent         |
| 80 – 89  | Good              |
| 70 – 79  | Fair              |
| 60 – 69  | Needs Improvement |
| 50 – 59  | Poor              |

### Note for Evaluators

The Webcam AI Trainer is intentionally kept as a local module because it requires direct access to hardware devices (camera and display). Cloud platforms such as Render do not provide access to physical webcam devices. All other modules are fully deployed and accessible online.

### Pose Analyzer

Scores exercise quality from webcam sessions on a 50–100 scale. Scores feed into the Wellness Score and Reports modules.

| Range    | Category          |
| -------- | ----------------- |
| 90 – 100 | Excellent         |
| 80 – 89  | Good              |
| 70 – 79  | Fair              |
| 60 – 69  | Needs Improvement |
| 50 – 59  | Poor              |

### Habit Tracker

Logs daily water intake, sleep hours, steps, and workout completion. Prevents duplicate entries, allows past-date logging, and restricts future dates. Displays a 14-day habit matrix and full history timeline.

### Virtual Gym Buddy

Gemini-powered fitness chatbot. Responds to questions about workouts, diet, goals, and healthy habits with context-aware answers.

### Reports

Aggregates health score, form score, average sleep and water intake, step totals, and workout statistics into a weekly summary. Gemini generates actionable improvement suggestions from the user's real data.

### Wellness Score

Computes a unified health score from water intake, sleep, steps, workout completion, form score, and habit consistency.

### Consistency Tracker

Tracks current streak, longest streak, total successful days, and weekly and monthly consistency percentages.

### Achievement System

Automatically awards badges when users hit milestones: First Workout, Hydration Hero, Sleep Champion, Weekly Warrior, Goal Crusher, Habit Builder, Step Master, and AI Explorer.

### Gym Finder

Reads the user's location from their profile and finds nearby fitness centers using OpenStreetMap, Nominatim, and the Overpass API. Supports an adjustable search radius and links directly to Google Maps directions.

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
  |-- Log Habits          (water, sleep, steps)
  |-- Log Workout         (manual entry)
  |-- Webcam Analysis     (AI pose detection + rep counting)
  |-- Search Nearby Gyms  (Gym Finder)
  |
  v
Neon PostgreSQL  (all data persisted)
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

### Dashboard

![Dashboard](screenshots/dashboard-hero.png)

### Analytics & Consistency Tracker

![Analytics](screenshots/dashboard-analytics.png)

### AI Dietician

![AI Dietician](screenshots/dietician-mealplan.png)

### AI Fitness Chat

![Fitness Chat](screenshots/fitness-chat.png)

### Habit Tracker

![Habit Tracker](screenshots/habit-tracker.png)

### Workout Tracker

![Workout Tracker](screenshots/workout-tracker.png)

### Webcam Trainer Interface

![Webcam Trainer](screenshots/webcam-trainer.png)

### Gym Finder

![Gym Finder](screenshots/gym-fnder.png)

### Reports & Insights

![Reports](screenshots/reports-overview.png)

### Profile & Personalized Goals

![Profile](screenshots/profile.png)

---

## Installation

### Prerequisites

- Node.js 18+
- Python 3.10+
- Neon PostgreSQL connection string
- Google Gemini API key

### Clone

```bash
git clone https://github.com/dodiyariya6/ai-gym-fitness-assistant
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

## Future Improvements

- React Native mobile application for iOS and Android
- Wearable device integration for passive health tracking
- Voice assistant for hands-free workout guidance
- ML-based fitness prediction and goal timeline estimation
- Advanced posture analysis with injury risk detection

---

## Contributor

**Riya Dodiya**

Developed the complete AI Gym & Fitness Assistant application, including frontend development, backend development, database integration, AI module integration, testing, documentation, and deployment.

---

## License

Developed as a Project for academic submission. For usage or collaboration inquiries, contact the contributor directly.
