<p align="center">
  <img src="docs/screenshots/01_landing_hero.png" alt="TripMate — Plan your perfect trip, together." width="100%">
</p>

<h1 align="center">🌍 TripMate</h1>

<p align="center">
  <b>AI-Powered Collaborative Trip Planning Platform</b><br>
  <i>Plan itineraries, vote on destinations, chat in real-time, and split expenses — all in one workspace.</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/Flask-3.1-blue?style=for-the-badge&logo=flask" alt="Flask">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Socket.IO-Realtime-010101?style=for-the-badge&logo=socketdotio" alt="Socket.IO">
  <img src="https://img.shields.io/badge/Scikit--Learn-ML-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white" alt="Scikit-Learn">
</p>

---

## 📖 Overview

TripMate is a full-stack, real-time collaborative travel planning platform built for group travellers. It combines **AI-driven destination recommendations** (TF-IDF + greedy route optimization), **Gradient Boosting cost estimation**, and a **WebSocket-powered workspace** where friends can co-edit itineraries, vote on plans, chat, and manage shared budgets — all synchronized live.

> **Target Region:** Sri Lanka — the platform ships with a curated catalog of 100+ Sri Lankan destinations, activities, and cost data.

---

## ✨ Key Features

| Category | Feature | Description |
|----------|---------|-------------|
| 🤖 **AI Planning** | NLP Recommendations | TF-IDF vectorization matches user preferences to destinations with greedy route optimization |
| 🤖 **AI Planning** | Cost Estimation | Gradient Boosting regressor predicts trip costs (R² ≈ 0.87, MAE ≈ LKR 1,200) |
| 🤖 **AI Planning** | 3 Route Variants | Generates *Balanced*, *Adventurous*, and *Off the Beaten Path* itinerary options |
| 🔄 **Real-Time** | Live Workspace | WebSocket-powered itinerary, chat, voting, and expense sync via Flask-SocketIO |
| 🔄 **Real-Time** | Online Presence | See who's currently editing the trip workspace |
| 💬 **Chat** | Trip Chat | Persistent, real-time group chat scoped per trip |
| 📋 **Itinerary** | Day-by-Day Builder | Add/remove days and activities with time slots, categories, and geo-coordinates |
| 🗺️ **Map** | Interactive Map | Leaflet-powered map with activity markers, destination pins, and route visualization |
| 🗳️ **Voting** | Group Decisions | Propose destinations, routes, or activities and let members vote to consensus |
| 💰 **Budget** | Expense Splitting | Track expenses with equal/percentage/custom splits and auto-calculated settlements |
| 💰 **Budget** | Admin Settlement | Trip creator can override and mark settlements as completed |
| 🌦️ **Weather** | Multi-City Forecast | OpenWeatherMap integration with per-day forecasts for all destinations |
| 👥 **Social** | Friend System | Send/accept friend requests with real-time notifications |
| 📧 **Email** | Branded Emails | Welcome, friend request, and trip invitation transactional emails via Flask-Mail |
| 🔐 **Security** | Strong Auth | JWT authentication with 12+ character password requirements and real-time validation UI |

---

## 📸 Screenshots

### Landing Page
The hero section features a parallax mountain landscape with a glassmorphic search bar for instant destination discovery.

<p align="center">
  <img src="docs/screenshots/01_landing_hero.png" alt="Landing Page Hero" width="100%">
</p>

### Feature Highlights
A bento-grid layout showcases core features — Smart Itineraries, Group Voting, and Expense Splitting — with interactive hover states.

<p align="center">
  <img src="docs/screenshots/02_features_section.png" alt="Features Section" width="100%">
</p>

### Destination Gallery
An asymmetric image gallery with real Sri Lankan destinations (Sigiriya, Ella, Mirissa) rendered on a dark canvas.

<p align="center">
  <img src="docs/screenshots/03_destinations_gallery.png" alt="Destinations Gallery" width="100%">
</p>

### Authentication
Split-screen authentication with real-time password strength validation and social login options.

<p align="center">
  <img src="docs/screenshots/04_login_page.png" alt="Login Page" width="49%">
  <img src="docs/screenshots/05_register_page.png" alt="Register Page" width="49%">
</p>

---

## 🏗️ Architecture

```
TripMate/
├── frontend/                  # Next.js 16 (App Router) + TypeScript
│   ├── app/                   # File-based routing
│   │   ├── page.tsx           # Landing page with parallax hero
│   │   ├── login/             # JWT authentication
│   │   ├── register/          # Account creation with password validation
│   │   ├── dashboard/         # Trip management dashboard
│   │   ├── trip/
│   │   │   ├── create/        # AI-powered trip creation wizard
│   │   │   └── [id]/          # Real-time collaborative workspace
│   │   └── settings/          # User preferences
│   └── src/
│       ├── components/
│       │   ├── workspace/     # ChatPanel, TripMap, WeatherPanel,
│       │   │                  # VotingPanel, SettlementPanel, VideoPanel
│       │   ├── ui/            # Button, Card, Input (design system)
│       │   ├── auth/          # AuthGuard, LoginForm
│       │   └── layout/        # DashboardLayout, Navbar
│       └── lib/               # API client, auth context, socket hooks
│
├── backend/                   # Python Flask + SQLAlchemy
│   ├── app/
│   │   ├── __init__.py        # App factory, SocketIO setup
│   │   ├── models.py          # 12 SQLAlchemy models (UUID PKs, JSONB)
│   │   ├── config.py          # Environment-driven configuration
│   │   ├── email_service.py   # Branded transactional email templates
│   │   ├── events.py          # Socket.IO event handlers
│   │   ├── middleware.py      # JWT auth decorator, CORS
│   │   └── routes/
│   │       ├── auth.py        # Register, login, profile
│   │       ├── trips.py       # CRUD, invite, member management
│   │       ├── itinerary.py   # Days & activities management
│   │       ├── recommendations.py  # AI engine (TF-IDF + route optimizer)
│   │       ├── expenses.py    # Expense tracking & settlements
│   │       ├── chat.py        # Persistent chat messages
│   │       ├── votes.py       # Voting system
│   │       ├── friends.py     # Friend requests & social graph
│   │       ├── external.py    # Weather & YouTube API proxies
│   │       └── notifications.py # In-app notifications
│   ├── Prediction Model/
│   │   └── Recommendation Model.pkl  # Pre-trained ML model
│   ├── migrations/            # Alembic database migrations
│   └── requirements.txt
```

### System Design

```mermaid
graph TB
    subgraph Client["Frontend — Next.js 16"]
        LP[Landing Page]
        AUTH[Auth Pages]
        DASH[Dashboard]
        WS[Trip Workspace]
        
        WS --> MAP[Leaflet Map]
        WS --> CHAT[Chat Panel]
        WS --> ITIN[Itinerary Builder]
        WS --> VOTE[Voting Panel]
        WS --> BUDGET[Settlement Panel]
        WS --> WEATHER[Weather Panel]
    end

    subgraph Server["Backend — Flask + SocketIO"]
        API[REST API Routes]
        SOCK[WebSocket Events]
        ML[ML Engine]
        EMAIL[Email Service]
        
        API --> DB[(PostgreSQL)]
        SOCK --> DB
        ML --> PKL[TF-IDF Model .pkl]
    end

    WS <-->|Socket.IO| SOCK
    Client -->|HTTP + JWT| API
    API -->|Weather/YouTube| EXT[External APIs]
```

---

## 🛠️ Technology Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| **Next.js 16** (App Router) | React framework with file-based routing and server components |
| **TypeScript 5** (Strict) | Type-safe development with compile-time error checking |
| **Tailwind CSS 4** | Utility-first styling with custom design tokens |
| **Framer Motion** | Fluid page transitions, micro-interactions, and layout animations |
| **Leaflet.js** + React-Leaflet | Interactive mapping with custom markers and route visualization |
| **Socket.IO Client** | Real-time bidirectional communication for live collaboration |
| **Lucide React** | Consistent, accessible icon library |
| **Sonner** | Toast notification system |

### Backend
| Technology | Purpose |
|-----------|---------|
| **Flask 3.1** | Lightweight Python web framework |
| **Flask-SocketIO** + Eventlet | Production-grade WebSocket handling for real-time features |
| **SQLAlchemy** + Flask-Migrate | ORM with Alembic migrations for PostgreSQL |
| **PyJWT** | Stateless JWT authentication |
| **Scikit-learn 1.6** | NLP recommendation engine (TF-IDF) and Gradient Boosting cost predictor |
| **NumPy + Pandas** | Data processing for ML pipelines |
| **Flask-Mail** | Branded transactional email delivery |
| **Flask-CORS** | Cross-origin resource sharing configuration |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| **PostgreSQL** | Primary relational database with UUID keys and JSONB columns |
| **OpenWeatherMap API** | Multi-city weather forecast data |
| **YouTube Data API** | Destination video discovery |

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version |
|------------|---------|
| [Node.js](https://nodejs.org/) | 18+ |
| [Python](https://www.python.org/) | 3.9+ |
| [PostgreSQL](https://www.postgresql.org/) | 14+ |
| Git | Latest |

### 1. Clone the Repository

```bash
git clone https://github.com/missakaedirisinghe/TripMate.git
cd TripMate
```

### 2. Backend Setup

```bash
# Navigate to the backend directory
cd backend

# Create and activate a virtual environment
python -m venv venv

# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your database URL, secret key, and API keys
```

**Required `.env` variables:**

```env
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tripmate
JWT_EXPIRATION_HOURS=24
JWT_ALGORITHM=HS256
MODEL_PATH=../Prediction Model/Recommendation Model.pkl
OPENWEATHERMAP_API_KEY=your-key  # Optional: enables weather forecasts
YOUTUBE_API_KEY=your-key          # Optional: enables video discovery
```

```bash
# Start the backend server
python run.py
```
> ✅ Backend runs at `http://localhost:8000`

### 3. Frontend Setup

```bash
# Open a new terminal and navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Configure environment variables
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Start the development server
npm run dev
```
> ✅ Frontend runs at `http://localhost:3000`

---

## 💡 Usage Guide

1. **Create an Account** — Register with a strong password (12+ characters with uppercase, lowercase, number, and special character).
2. **Add Friends** — Search users by email and send friend requests from the dashboard.
3. **Create a Trip** — Use the AI Trip Planner: enter your destination, preferences, and budget. The system generates 3 itinerary variants (Balanced, Adventurous, Off the Beaten Path).
4. **Select a Route** — Compare the AI-generated routes side-by-side and apply your preferred one.
5. **Collaborate** — Enter the Trip Workspace to:
   - 📋 Edit the itinerary (add/remove days and activities)
   - 💬 Chat with trip members in real-time
   - 🗺️ View all activities on the interactive map
   - 🗳️ Create and vote on group proposals
   - 💰 Log expenses and view auto-calculated settlements
   - 🌦️ Check weather forecasts for each destination
6. **Settle Up** — The trip creator can mark settlements as completed for final budget reconciliation.

---

## 📊 Database Schema

The platform uses **12 normalized tables** with UUID primary keys and JSONB fields:

| Model | Description |
|-------|-------------|
| `User` | Accounts with travel preferences and bucket lists |
| `Trip` | Trip metadata with status tracking (planning → active → completed) |
| `TripMember` | Many-to-many membership with roles (owner, admin, member) |
| `ItineraryDay` | Ordered days within a trip |
| `Activity` | Geo-located activities with categories, costs, and images |
| `Expense` | Flexible expense tracking with equal/percentage/custom splits |
| `Settlement` | Debt settlement records between members |
| `Vote` | Multi-type voting (destination, route, activity, accommodation) |
| `ChatMessage` | Persistent real-time chat messages |
| `Destination` | Curated Sri Lankan destination catalog |
| `Notification` | In-app notification system |
| `Friendship` | Bidirectional friend request system |
| `PendingInvite` | Token-based trip invitations for non-registered users |

---

## 🤖 AI & Machine Learning

### Destination Recommendation Engine
- **Algorithm:** TF-IDF Vectorization + Cosine Similarity
- **Optimization:** Greedy nearest-neighbor route optimization
- **Output:** 3 diverse itinerary variants with noise-based diversification
- **Dataset:** 100+ Sri Lankan destinations with activity tags, ratings, and coordinates

### Cost Estimation Model
- **Algorithm:** Gradient Boosting Regressor (Scikit-learn)
- **Performance:** R² ≈ 0.87 | MAE ≈ LKR 1,200
- **Features:** Destination type, duration, group size, activity categories, accommodation tier

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<p align="center">
  Built with ❤️ for collaborative travel planning<br>
  <b>TripMate</b> — Plan your perfect trip, together.
</p>
