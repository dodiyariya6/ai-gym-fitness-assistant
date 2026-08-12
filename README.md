# IFA

## Intelligent Fitness Assistant

> Your Personal AI Gym & Fitness Assistant

![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=000000)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Gemini_AI-4285F4?style=for-the-badge&logo=google&logoColor=white)
![MediaPipe](https://img.shields.io/badge/MediaPipe-00897B?style=for-the-badge&logo=google&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white)
![pytest](https://img.shields.io/badge/pytest-0A9EDC?style=for-the-badge&logo=pytest&logoColor=white)

---

## Live Demo

> **IFA — Intelligent Fitness Assistant** is deployed and available online.

| Service               | Link |
| --------------------- | ---- |
| **Web Application**   | [https://ai-gym-fitness-assistant-beta.vercel.app](https://ai-gym-fitness-assistant-beta.vercel.app) |
| **Backend API**       | [https://ai-gym-fitness-assistant-e2rv.onrender.com](https://ai-gym-fitness-assistant-e2rv.onrender.com) |
| **API Documentation** | [https://ai-gym-fitness-assistant-e2rv.onrender.com/docs](https://ai-gym-fitness-assistant-e2rv.onrender.com/docs) |

**Frontend:** Vercel · **Backend:** Render · **Database:** Neon PostgreSQL · **AI:** Google Gemini

---

IFA is a full-stack fitness platform that tracks workouts and daily habits, generates AI meal plans, scores a webcam-based exercise session in real time, and turns all of that logged data into a single, grounded set of AI insights — a Dashboard, a Coach, and a deeper Reports view all reading from the same source of truth instead of three disconnected AI features.

---

## Overview

Most fitness apps are one thing: a workout logger, or a calorie counter, or a chatbot. IFA is built around a different idea — that a workout log, a sleep log, and a wellness score are only useful together, and that AI should *interpret* real, already-computed numbers rather than generate advice from nothing.

Every module writes to the same PostgreSQL database. A deterministic analytics layer turns that data into a wellness score, trend directions, progressive-overload trends, and habit/workout correlations — all plain arithmetic, no AI involved. Only then does Gemini get called, and only to interpret those already-computed findings into short, evidence-backed insights. If Gemini is unavailable, the same findings are rendered as insights directly, without an AI call at all.

---

## Why IFA?

Fragmented fitness apps make the user do the connecting work themselves: log a workout in one app, sleep in another, meals somewhere else, and manually notice that a bad night's sleep tanked yesterday's squat form. IFA keeps everything in one schema so those connections can be computed and surfaced automatically — a habit/workout correlation finding, a wellness score breakdown, a progressive-overload trend per exercise — instead of left for the user to infer.

IFA combines:

- Workout tracking (manual and webcam-generated, one shared history)
- An AI coach with real conversational memory, grounded in the user's actual data
- Habit tracking (water, sleep, steps, workout completion)
- AI-generated, persisted nutrition plans
- Deterministic wellness analytics and trends
- Webcam-based exercise form analysis, running entirely in the user's own browser (see [Webcam Trainer](#webcam-trainer))
- Nearby gym discovery with an interactive map
- Personalized, evidence-linked insights shared across Dashboard, Reports, Habits and Workout

---

## Core Capabilities

### AI Coach
A Gemini-powered fitness chatbot grounded in the user's real, already-computed context — recent workouts, habit trends, wellness score, weaknesses and improvements — never a generic chatbot. Conversations persist as sessions; each reply is generated from a bounded recent-history window (not the full lifetime conversation), so context stays relevant without unbounded prompt growth. Falls back to a fixed, safe message if Gemini is unavailable.

### Workout Tracking
Manual exercise logging (sets, reps, duration, notes, date) with automatic MET-based calorie estimation using the user's body weight. Every workout — manual or webcam-generated — is deleteable, with ownership-checked deletion that correctly updates history, stats, and analytics on the next load.

### AI Webcam Trainer
Real-time pose detection via MediaPipe Tasks Vision, running entirely client-side against the visitor's own camera: tracks body landmarks, counts reps through joint-angle analysis, and scores exercise form 0–100. Supports Squats, Bicep Curls, Pushups, Lunges, and Jumping Jacks. See [Webcam Trainer](#webcam-trainer) for the architecture and browser requirements.

### Habit Tracking
Daily logging of water intake, sleep, steps, and workout completion, with duplicate-entry prevention, past-date backfilling, a weekly matrix view, and per-entry deletion. Surfaces habit/workout correlation and consistency insights inline.

### AI Dietician
Calculates BMI, BMR (Mifflin-St Jeor) and TDEE from profile data, then asks Gemini for a personalized meal plan and grocery list. Every generated plan is persisted — a "Recent Plans" list lets the user reload a saved plan (no new Gemini call) as a clearly separate action from generating a new one.

### Wellness Analytics
A single 0–100 wellness score computed from sleep, hydration, steps, workout completion, form score, and logging streak, with a per-component point breakdown so the user can see exactly what moved the score.

### Reports
The deeper analytics view: KPI trends, the full wellness score breakdown, and the complete set of structured AI insights (category, priority, evidence, recommendation) — not just the compact top items shown on the Dashboard.

### Gym Finder
Finds nearby gyms via OpenStreetMap/Overpass from the user's browser location (or their saved Profile city as a fallback), with an adjustable search radius and an interactive Leaflet map showing the user's position and every result.

### Profile
The single source of personalization — biometrics, fitness goals, activity level, and location — used to generate personalized water/sleep/step/calorie targets that the Dietician, Habits, and analytics all read from.

---

## Product Architecture

```
User
  │
  ▼
Profile / Goals  (biometrics, fitness goals, activity level)
  │
  ▼
Workouts + Habits + Nutrition   (logged activity)
  │
  ▼
Analytics Engine   (deterministic: wellness score, trends,
  │                  progressive overload, correlations)
  ▼
User Fitness Context   (compact, pre-aggregated summary)
  │
  ▼
AI Intelligence   (Gemini interprets — never recalculates)
  │
  ▼
Personalized Insights
  │
  ▼
Dashboard  /  Reports  /  AI Coach
```

Deterministic analytics and AI interpretation are deliberately kept in separate layers. Every number the user sees (wellness score, trend arrows, correlation strength) is computed by plain Python/SQL — Gemini only ever explains or ranks findings that already exist. This means the app keeps working, with the same numbers, if the AI provider is down.

---

## AI Architecture

**Deterministic logic handles:**
- Wellness score and its per-component breakdown
- Daily/weekly trend directions (up / down / neutral)
- Progressive overload detection per exercise (improving / plateau / declining, from session-over-session rep and volume averages)
- Habit/workout correlation (Pearson's r, gated by a minimum sample size, always reported as an association — never causation)
- BMI / BMR / TDEE / macro calculations
- Consistency streaks and achievement unlocks

**AI (Gemini) handles:**
- Interpreting those findings into short, prioritized, evidence-linked insights
- Contextual coaching replies grounded in the user's real data
- Meal plan and grocery list generation

**UserFitnessContext** is the one compact object handed to Gemini for both insights and coaching — goals, workout summary and trend, habit summary and trend, wellness score, recent achievements, and already-computed weaknesses/improvements. Gemini never sees raw database rows, and for a brand-new user with no history, the context says so explicitly rather than letting the model invent a plausible-sounding workout history.

**Reliability:** every Gemini call goes through one shared `safe_invoke()` path with a timeout. If the API key is missing, the call times out, or the response fails schema validation, the app falls back to deterministic-only output — insights are still generated from the same findings (just without AI phrasing), and chat replies fall back to a fixed, safe message. Nothing 500s because Gemini is unavailable.

**Cost control:** insights are cached server-side, keyed by a hash of the underlying findings — an unchanged wellness score/trends/findings within a 6-hour window returns the cached result instead of calling Gemini again. Any change to the underlying data (including a deletion) changes the hash and triggers fresh interpretation. Chat history sent to Gemini is bounded by both message count and a character budget. Dietician plans and grocery lists are persisted and reused on request rather than regenerated.

---

## Data Flow

```
Profile
  → Workouts, Habits, Meal Plans        (logged / generated data)
  → Analytics Service                    (wellness score, trends)
  → Progressive Overload / Correlation   (per-exercise + habit findings)
  → UserFitnessContext                   (compact summary)
  → AI Insight Service                   (Gemini interpretation + cache)
  → Dashboard (compact) / Reports (deep) / AI Coach (conversational)
```

---

## Screenshots

The screenshots below were captured before the current UI intelligence panels, Gym Finder map, and Dietician history were added, and still show the project's earlier "AI Gym & Fitness Assistant" branding — they're kept because they accurately demonstrate the underlying features, not because they show the latest UI. Layout and branding have since moved on; functionality has not regressed.

### Dashboard
![Dashboard](screenshots/dashboard-hero.png)

### Analytics & Consistency Tracker
![Analytics](screenshots/dashboard-analytics.png)

### AI Dietician
![AI Dietician](screenshots/dietician-mealplan.png)
*Predates persisted meal-plan history — shows generation only.*

### AI Fitness Chat
![Fitness Chat](screenshots/fitness-chat.png)

### Habit Tracker
![Habit Tracker](screenshots/habit-tracker.png)

### Workout Tracker
![Workout Tracker](screenshots/workout-tracker.png)

### Webcam Trainer Interface
![Webcam Trainer](screenshots/webcam-trainer.png)

### Webcam Live Pose Detection
![Webcam Live Detection](screenshots/webcam-live-detection.png)
*Captured against the earlier server-side detection flow — the live camera view and rep-counting shown here are unchanged in the current browser-based implementation (see [Webcam Trainer](#webcam-trainer)).*

### Gym Finder
![Gym Finder](screenshots/gym-fnder.png)
*Predates the interactive map — shows the result list only.*

### Reports & Insights
![Reports](screenshots/reports-overview.png)

### Profile & Personalized Goals
![Profile](screenshots/profile.png)

---

## Tech Stack

### Frontend
| Technology | Role |
| --- | --- |
| React 19 + Vite | UI framework and build tooling |
| React Router DOM v7 | Client-side routing and protected routes |
| Framer Motion | Animation |
| Recharts | Analytics charts |
| Axios | API client (shared instance, auto-attaches JWT) |
| Leaflet + React Leaflet | Interactive Gym Finder map |
| MediaPipe Tasks Vision | Client-side pose detection for the Webcam Trainer |
| Lucide React | Icon set |

### Backend
| Technology | Role |
| --- | --- |
| FastAPI | REST API |
| SQLAlchemy | ORM |
| Pydantic | Request/response validation and schemas |
| python-jose | JWT encode/decode |
| passlib + bcrypt | Password hashing |
| slowapi | Per-route rate limiting |

### Database
| Technology | Role |
| --- | --- |
| Neon PostgreSQL | Production database — single source of truth |
| SQLite (in-memory) | Isolated database for the automated test suite only |

### AI
| Technology | Role |
| --- | --- |
| Google Gemini (`gemini-2.5-flash`, via `langchain-google-genai`) | Insight interpretation, AI coach, meal plans, grocery lists |

### Maps / External APIs
| Technology | Role |
| --- | --- |
| OpenStreetMap | Map tiles |
| Nominatim | Geocoding (profile city → coordinates) |
| Overpass API | Nearby gym search |
| Leaflet | Map rendering |

### Testing
| Technology | Role |
| --- | --- |
| pytest | Backend automated test suite |
| FastAPI `TestClient` | HTTP-level API testing |

### Deployment
| Layer | Platform |
| --- | --- |
| Frontend | Vercel |
| Backend | Render |
| Database | Neon |

---

## Project Structure

```
AIGymProject/
├── backend/
│   ├── app/
│   │   ├── models/        SQLAlchemy models (User, Profile, Workout, Habit,
│   │   │                  MealPlan, ChatSession/Message, Achievement)
│   │   ├── schemas/       Pydantic request/response schemas
│   │   ├── routers/       FastAPI route groups (auth, profile, workout,
│   │   │                  habit, diet, analytics, fitness_chat,
│   │   │                  consistency, achievements, gym_finder)
│   │   ├── services/      Business logic — deterministic analytics,
│   │   │                  AI orchestration, calorie estimation
│   │   ├── database.py    Engine/session configuration
│   │   └── main.py        App entrypoint, CORS, routers
│   ├── tests/              pytest suite (isolated in-memory DB, mocked AI)
│   └── requirements.txt
│
├── frontend/
│   └── src/
│       ├── pages/          One component per route (Dashboard, Workout,
│       │                    Habits, Dietician, Reports, GymFinder,
│       │                    Webcam, ...)
│       ├── components/     Shared UI (ConfirmDialog, InsightList, GymMap, ...)
│       ├── services/       Axios wrappers per backend router
│       ├── context/        Auth and toast providers
│       ├── layouts/        Shared dashboard shell (Sidebar + Navbar)
│       ├── utils/          Client-side pose/rep-counting logic
│       │                    (exerciseCounters.js) and other shared helpers
│       └── styles/         Per-page and shared CSS
│
└── screenshots/
```

---

## Authentication & Security

- **JWT authentication** — bearer tokens issued on both login and registration, verified on every protected route via a shared dependency.
- **Protected routes** — the frontend gates every authenticated page behind a single `ProtectedRoute` check; the backend independently re-verifies the token on every request regardless of what the frontend does.
- **Ownership checks** — every record lookup (habit, workout, meal plan, chat session) filters by the authenticated user's id. Accessing or deleting another user's record returns `404`, never `403` — the API never confirms another user's record even exists.
- **Password security** — passwords are hashed with bcrypt; plaintext is never stored or logged.
- **Rate limiting** — auth and chat endpoints are rate-limited per-IP via `slowapi`.
- **AI key security** — `GEMINI_API_KEY` is read server-side only; it is never sent to, or reachable from, the frontend.
- **CORS** — restricted to the known frontend origins (local dev + the deployed Vercel domain), not a wildcard.

---

## AI Reliability

- **Structured output** — insights are requested from Gemini as a schema-validated structured response; a malformed response is rejected before it ever reaches the frontend, not regex-parsed from free text.
- **Deterministic fallback** — if Gemini is unconfigured, times out, or returns something invalid, insights are built directly from the same underlying findings (wellness breakdown, overload trends, correlations) with no AI-generated text, and the response is tagged with its source (`"ai"` or `"fallback"`).
- **Bounded chat history** — the coach reasons over a recent-message window bounded by both count and a character budget, not the full conversation.
- **Insight caching** — a content-hash cache avoids re-calling Gemini when nothing relevant has changed (see [AI Architecture](#ai-architecture)).
- **No fabricated history** — a new user with no logged data gets explicit "no data yet" framing in both the AI context and the insight output, never an invented workout or trend.

---

## Testing

The backend has an automated pytest suite (`backend/tests/`) that runs against an isolated in-memory SQLite database — the real Neon database and the real Gemini API are never touched by a test. Gemini is forced "unavailable" by default so every test exercises the deterministic fallback path unless it explicitly mocks a Gemini call.

Coverage includes:
- Auth/onboarding (token issuance, profile-completion signal)
- Deterministic analytics (no fabricated history for new users, progressive overload detection, non-causal correlation wording, insights schema)
- AI reliability (Gemini-unavailable fallback for both insights and chat)
- Chat session persistence, bounded history, and cross-user isolation
- Habit/workout/meal-plan deletion (ownership checks, 404-not-403, idempotency, webcam-generated workouts)
- Meal plan persistence and reuse (grocery-list ownership checks, history isolation)
- The progressive-overload endpoint

Run it locally:

```bash
cd backend
pytest
```

This is not a claim of 100% coverage — it targets the behaviors above rather than every line of code.

---

## Installation

### Prerequisites
- Node.js 18+
- Python 3.10+
- A Neon (or any) PostgreSQL connection string
- A Google Gemini API key

### 1. Clone
```bash
git clone https://github.com/dodiyariya6/AI-Gym-Fitness-Assistant.git
cd AI-Gym-Fitness-Assistant
```

### 2. Backend setup
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Environment variables
Copy `backend/.env.example` to `backend/.env` and fill in real values (see [Environment Variables](#environment-variables)).

### 4. Database
No manual migration step — SQLAlchemy's `Base.metadata.create_all()` creates any missing tables against `DATABASE_URL` on backend startup.

### 5. Frontend setup
```bash
cd frontend
npm install
```
Copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_URL` to your backend's URL.

### 6. Run locally
```bash
# Terminal 1 — backend
cd backend && uvicorn app.main:app --reload
# API at http://127.0.0.1:8000, docs at /docs

# Terminal 2 — frontend
cd frontend && npm run dev
# App at http://localhost:5173
```

---

## Environment Variables

**Backend** — `backend/.env`

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
GEMINI_API_KEY=your_google_gemini_api_key_here
SECRET_KEY=change_this_to_a_secure_random_secret_key_32bytes_plus
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

**Frontend** — `frontend/.env`

```env
VITE_API_URL=http://127.0.0.1:8000
```

No secrets are committed to this repository — the values above are placeholders.

---

## Webcam Trainer

The AI Webcam Trainer runs pose detection **entirely in the visitor's browser** — it does not depend on the backend having camera access at all, and works identically in local development and in production for any visitor.

**Architecture:** clicking Start Session calls `navigator.mediaDevices.getUserMedia()` to request the visitor's own camera, then runs MediaPipe Tasks Vision's `PoseLandmarker` (WASM, loaded client-side from Google's model CDN) against the live video feed via `requestAnimationFrame`. The five per-exercise rep-counting/form-scoring state machines (Squats, Bicep Curls, Pushups, Lunges, Jumping Jacks) run as plain JavaScript in `frontend/src/utils/exerciseCounters.js` — a deliberate line-for-line port of what used to be server-side Python services, so behavior is unchanged, only where it executes. No video frame is ever sent to the backend; when the session ends, only the final summary (exercise, reps, duration, calories, form score) is saved through the same `POST /workout/save` endpoint used by manual logging.

This is why the webcam trainer is fully functional on the deployed frontend, unlike an earlier version of this project that ran pose detection server-side (`cv2.VideoCapture` against the backend host's own camera) — an architecture that could only ever work on the developer's own machine, since a deployed backend has no camera or display.

**Requirements:**
- A secure context — HTTPS in production (Vercel provides this by default) or `localhost` in development. Browsers refuse camera access otherwise.
- Camera permission granted when the browser prompts.
- A modern browser with `getUserMedia` support (Chrome, Edge, Firefox, Safari — desktop and mobile).

**Handled explicitly:** permission denied, no camera device, camera already in use by another app/tab, unsupported browser, and the camera is always stopped when the session ends or the user navigates away — it never keeps running in the background, and no video is uploaded, recorded, or stored anywhere.

---

## API Overview

All endpoints except `/`, `/auth/register`, and `/auth/login` require a `Bearer` JWT.

| Group | Base route | Covers |
| --- | --- | --- |
| Authentication | `/auth` | Register (issues a token), login |
| Profile | `/profile` | Get/create/update profile, generate & fetch personalized targets |
| Workouts | `/workout` | Log, list, delete (manual and webcam-generated) |
| Habits | `/habit` | Log, update, list, delete |
| Analytics | `/analytics` | Aggregate stats, trends, AI insights, per-exercise progressive overload |
| Consistency | `/consistency` | Streaks and weekly/monthly consistency |
| Achievements | `/achievements` | Badge evaluation and unlock status |
| Fitness Chat | `/fitness` | AI coach messages, session list, session history |
| Dietician | `/diet` | BMI/BMR/TDEE/macros, meal plan + grocery generation, plan history, delete |
| Gym Finder | `/gym-finder` | Profile-location lookup, nearby gym search |

The Webcam Trainer has no dedicated backend route — pose detection runs entirely in the browser (see [Webcam Trainer](#webcam-trainer)); a finished session is saved through the same `/workout` endpoints as manual logging.

Full interactive documentation is auto-generated by FastAPI at `/docs` on any running backend instance.

---

## Deployment

| Layer | Platform | URL |
| --- | --- | --- |
| Frontend | Vercel | https://ai-gym-fitness-assistant-beta.vercel.app |
| Backend API | Render | https://ai-gym-fitness-assistant-e2rv.onrender.com |
| API Docs | Render (FastAPI) | https://ai-gym-fitness-assistant-e2rv.onrender.com/docs |
| Database | Neon PostgreSQL | — |

Every module, including the AI Webcam Trainer, is fully deployed and functional online — the webcam trainer runs entirely in the visitor's own browser, so it works the same way for any visitor as it does locally (see [Webcam Trainer](#webcam-trainer)).

---

## Limitations

- **Gemini dependency** — AI-authored insight phrasing, meal plans, and coach replies require Gemini availability; the app degrades to deterministic-only output rather than failing, but that output is necessarily less personalized in wording (the underlying numbers are unaffected).
- **Gym Finder depends on OpenStreetMap/Overpass** — result quality and availability depend on that community data source and public API; sparse-data regions may return few or no results.
- **Single production database** — no read replicas or horizontal scaling configured; appropriate for this project's current scale.

---

## Future Scope

In line with keeping IFA a small set of excellent, connected capabilities rather than a large one:

- Let the AI Coach reference recent meal plans in conversation, not just workouts/habits.
- Extract a couple of duplicated per-page loading/error UI patterns into shared components.
- Add pagination to Workout/Habit history once individual users' logs grow large.
- Expand automated test coverage to the frontend (currently backend-only).

---

## Project Status

IFA is a complete, working full-stack application — authentication, tracking, AI coaching, analytics, and deployment are all implemented and covered by an automated test suite, not a partial prototype. It is a portfolio/academic engineering project: production-*shaped* (JWT auth, ownership checks, rate limiting, CI-style test isolation, graceful AI degradation), but run on a single free-tier database and backend instance rather than production infrastructure.

---

## Contributor

**Riya Dodiya**

Developed as part of an academic engineering project.

Responsibilities: frontend development · backend API development · AI integration · database integration · testing · deployment · documentation

---

## License

Developed as a project for academic submission, as part of an engineering curriculum.
