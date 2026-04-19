# TripMate — Project Status Report

**Date:** 2026-03-31  
**Stack:** Next.js (App Router) + Flask + SQLAlchemy + Tailwind CSS + Framer Motion

---

## ✅ Completed

### Backend — Flask API

| Feature                  | Files                                                                                                              | Notes                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| **App Factory & Config** | [**init**.py](file:///e:/TripMate/backend/app/__init__.py), [config.py](file:///e:/TripMate/backend/app/config.py) | Flask factory pattern, CORS, Flask-Migrate initialized                                               |
| **JWT Auth Middleware**  | [middleware.py](file:///e:/TripMate/backend/app/middleware.py)                                                     | `@token_required` and `@trip_member_required` decorators                                             |
| **Auth Routes**          | [auth.py](file:///e:/TripMate/backend/app/routes/auth.py)                                                          | Register, Login, `GET/PUT /me` (profile)                                                             |
| **Trip CRUD**            | [trips.py](file:///e:/TripMate/backend/app/routes/trips.py)                                                        | Create, Read, Update, Delete trips; invite members; list/remove members                              |
| **Itinerary Engine**     | [itinerary.py](file:///e:/TripMate/backend/app/routes/itinerary.py)                                                | Add/delete days; add/update/delete activities per day                                                |
| **Expense Tracking**     | [expenses.py](file:///e:/TripMate/backend/app/routes/expenses.py)                                                  | Add/delete expenses; budget summary with per-member balances; equal/percentage/custom splitting      |
| **Voting System**        | [votes.py](file:///e:/TripMate/backend/app/routes/votes.py)                                                        | Cast, retract, and tally votes by type (destination, route, activity, accommodation)                 |
| **ML Recommendations**   | [recommendations.py](file:///e:/TripMate/backend/app/routes/recommendations.py)                                    | `LocationRecommender` model served via dill; `POST /recommend` endpoint                              |
| **Cost Estimation Stub** | [recommendations.py](file:///e:/TripMate/backend/app/routes/recommendations.py)                                    | Heuristic-based cost estimator (`POST /estimate-cost`)                                               |
| **External APIs Proxy**  | [external.py](file:///e:/TripMate/backend/app/routes/external.py)                                                  | OpenWeatherMap 5-day forecast, YouTube travel videos, destination catalog                            |
| **Database Models**      | [models.py](file:///e:/TripMate/backend/app/models.py)                                                             | 7 models: `User`, `Trip`, `TripMember`, `ItineraryDay`, `Activity`, `Expense`, `Vote`, `Destination` |
| **Migrations**           | [migrations/](file:///e:/TripMate/backend/migrations)                                                              | Alembic setup complete                                                                               |
| **Seed Script**          | [seed_destinations.py](file:///e:/TripMate/backend/scripts/seed_destinations.py)                                   | Populates Sri Lankan destination catalog                                                             |
| **Test Suite (Partial)** | [tests/](file:///e:/TripMate/backend/tests)                                                                        | `test_auth.py`, `test_trips.py`, `test_recommendations.py` with pytest fixtures                      |
| **Health Check**         | [**init**.py](file:///e:/TripMate/backend/app/__init__.py)                                                         | `GET /health` returns service status + ML model loaded flag                                          |

---

### Frontend — Next.js (App Router)

| Feature              | Files                                                                                         | Notes                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Landing Page**     | [page.tsx](file:///e:/TripMate/frontend/app/page.tsx)                                         | Hero with parallax scroll, floating nav, bento-grid features, destinations gallery, about section, footer |
| **Login Page**       | [login/page.tsx](file:///e:/TripMate/frontend/app/login/page.tsx)                             | JWT-based email/password login                                                                            |
| **Register Page**    | [register/page.tsx](file:///e:/TripMate/frontend/app/register/page.tsx)                       | User registration form                                                                                    |
| **Dashboard**        | [dashboard/page.tsx](file:///e:/TripMate/frontend/app/dashboard/page.tsx)                     | Trip listing with cards                                                                                   |
| **Trip Creation**    | [trip/create/page.tsx](file:///e:/TripMate/frontend/app/trip/create/page.tsx)                 | Multi-field trip creation form                                                                            |
| **Trip Workspace**   | [trip/[id]/page.tsx](file:///e:/TripMate/frontend/app/trip/%5Bid%5D/page.tsx)                 | Full workspace with itinerary builder, map, voting, weather, video, AI planner panels (30KB page)         |
| **Trips Listing**    | [trips/page.tsx](file:///e:/TripMate/frontend/app/trips/page.tsx)                             | Browse/search all trips                                                                                   |
| **Settings Page**    | [settings/page.tsx](file:///e:/TripMate/frontend/app/settings/page.tsx)                       | Profile edit, password change, logout (danger zone)                                                       |
| **404 Page**         | [not-found.tsx](file:///e:/TripMate/frontend/app/not-found.tsx)                               | Custom not found page                                                                                     |
| **Auth Context**     | [auth-context.tsx](file:///e:/TripMate/frontend/src/lib/auth-context.tsx)                     | React context for JWT auth state                                                                          |
| **API Client**       | [api.ts](file:///e:/TripMate/frontend/src/lib/api.ts)                                         | Full typed API client (auth, trips, itinerary, expenses, votes, recommendations)                          |
| **Dashboard Layout** | [DashboardLayout.tsx](file:///e:/TripMate/frontend/src/components/layout/DashboardLayout.tsx) | Sidebar + topbar layout shell                                                                             |
| **Auth Layout**      | [AuthLayout.tsx](file:///e:/TripMate/frontend/src/components/auth/AuthLayout.tsx)             | Login/register layout wrapper                                                                             |

---

### Workspace Panels (Trip `[id]` Page)

| Panel               | File                                                                                           | Notes                                  |
| ------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------- |
| **Interactive Map** | [TripMap.tsx](file:///e:/TripMate/frontend/src/components/workspace/TripMap.tsx)               | Leaflet.js with activity markers       |
| **AI Planner**      | [AIPlannerPanel.tsx](file:///e:/TripMate/frontend/src/components/workspace/AIPlannerPanel.tsx) | ML recommendation + cost estimation UI |
| **Voting Panel**    | [VotingPanel.tsx](file:///e:/TripMate/frontend/src/components/workspace/VotingPanel.tsx)       | Cast/retract votes with tallies        |
| **Weather Panel**   | [WeatherPanel.tsx](file:///e:/TripMate/frontend/src/components/workspace/WeatherPanel.tsx)     | 5-day forecast display                 |
| **Video Panel**     | [VideoPanel.tsx](file:///e:/TripMate/frontend/src/components/workspace/VideoPanel.tsx)         | YouTube travel video carousel          |

---

### Reusable UI Components

| Component       | File                                                                                  |
| --------------- | ------------------------------------------------------------------------------------- |
| `Button`        | [Button.tsx](file:///e:/TripMate/frontend/src/components/ui/Button.tsx)               |
| `Card`          | [Card.tsx](file:///e:/TripMate/frontend/src/components/ui/Card.tsx)                   |
| `Input`         | [Input.tsx](file:///e:/TripMate/frontend/src/components/ui/Input.tsx)                 |
| `Modal`         | [Modal.tsx](file:///e:/TripMate/frontend/src/components/ui/Modal.tsx)                 |
| `ToastProvider` | [ToastProvider.tsx](file:///e:/TripMate/frontend/src/components/ui/ToastProvider.tsx) |

---

### Design System & Assets

| Item                      | Location                                                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Design Tokens (MASTER.md) | [MASTER.md](file:///e:/TripMate/design-system/tripmate/MASTER.md)                                                                                            |
| Destination images        | [public/assets/images/](file:///e:/TripMate/frontend/public/assets/images) (Sigiriya, Ella, Mirissa, landscapes)                                             |
| Icons & animations dirs   | [public/assets/icons/](file:///e:/TripMate/frontend/public/assets/icons), [public/assets/animations/](file:///e:/TripMate/frontend/public/assets/animations) |

---

## 🔲 To Be Completed

### 🔴 High Priority

| #   | Feature                                 | Details                                                                                                                                                                                  |
| --- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Real-Time Collaboration (WebSocket)** | Currently all data is fetched via REST polling. No live updates when group members edit itineraries, vote, or add expenses simultaneously. Needs Socket.IO / WebSocket integration.      |
| 2   | **Cost Estimation ML Model**            | The `/estimate-cost` endpoint is a **heuristic stub** (hardcoded rates). The TODO in code says: _"Replace with trained Logistic Regression model"_. Model training + `.pkl` file needed. |
| 3   | **Notifications System**                | No in-app or email notifications for invites, itinerary changes, expense additions, or vote results.                                                                                     |
| 4   | **Invite System (Email)**               | Backend has `POST /trips/:id/invite` but it only adds by email if user exists. No email invitation flow for non-registered users.                                                        |
| 5   | **Expense Settlement Flow**             | Backend calculates balances but there's no UI for **settling debts** ("Mark as Paid", payment links, etc.).                                                                              |
| 6   | **Search Bar Functionality**            | The hero search bar on the landing page is **read-only** (`readOnly` attribute). Needs actual destination search + redirect.                                                             |

---

### 🟡 Medium Priority

| #   | Feature                                | Details                                                                                                                                 |
| --- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 7   | **User Avatar Upload**                 | `User.avatar_url` field exists but no file upload endpoint or UI.                                                                       |
| 8   | **Travel Preferences Onboarding**      | `preferred_activities` and `bucket_list` fields on User model exist but there's no onboarding wizard or settings UI to populate them.   |
| 9   | **Drag-and-Drop Itinerary Reordering** | `order_index` fields exist on `ItineraryDay` and `Activity`, but no drag-and-drop UI or reorder API endpoint.                           |
| 10  | **Trip Status Workflow**               | Statuses (`planning`, `ready`, `active`, `completed`) exist but no UI to transition between them or filter by status.                   |
| 11  | **Destination Detail Pages**           | Landing page links to `/destinations/sigiriya`, `/destinations/ella`, `/destinations/mirissa` — these pages **don't exist** (will 404). |
| 12  | **Privacy, Terms, Contact Pages**      | Footer links to `/privacy`, `/terms`, `/contact` — these pages **don't exist**.                                                         |
| 13  | **Mobile Responsive Nav**              | Landing page nav hides links on mobile with `hidden md:flex`. No hamburger menu or mobile drawer.                                       |
| 14  | **Loading/Skeleton States**            | Some pages have loading states but the workspace panels could use better skeleton UIs.                                                  |
| 15  | **Error Boundary Components**          | No global or per-page error boundaries for crash recovery.                                                                              |

---

### 🟢 Low Priority / Polish

| #   | Feature                                | Details                                                                                                                                      |
| --- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 16  | **Backend Test Coverage**              | Only 3 test files (`test_auth`, `test_trips`, `test_recommendations`). Missing: itinerary, expenses, votes, external API tests.              |
| 17  | **Rate Limiting**                      | No rate limiting on auth endpoints (login/register brute-force vulnerable).                                                                  |
| 18  | **Input Validation & Sanitization**    | Basic validation exists but no schema validation library (e.g., Marshmallow/Pydantic).                                                       |
| 19  | **Deployment Configuration**           | No `Dockerfile`, `docker-compose.yml`, CI/CD pipeline, or production configs.                                                                |
| 20  | **Environment Variable Documentation** | `.env.example` exists for backend but frontend `.env.local` is not documented.                                                               |
| 21  | **SEO Meta Tags**                      | Landing page lacks `<title>`, `<meta description>`, and Open Graph tags.                                                                     |
| 22  | **PWA / Offline Support**              | No service worker, manifest, or offline capability.                                                                                          |
| 23  | **Accessibility Audit**                | Design system mentions WCAG 2.1 but no `aria-*` attributes, skip-nav, or keyboard navigation testing done.                                   |
| 24  | **Analytics / Logging**                | No frontend analytics (GA, Plausible) or structured backend logging.                                                                         |
| 25  | **Password Reset Flow**                | No "Forgot Password" feature (email-based OTP or magic link).                                                                                |
| 26  | **Social Login (OAuth)**               | No Google/Facebook/Apple Sign-In.                                                                                                            |
| 27  | **Design System Consistency**          | Landing page uses hardcoded colors (`#00D1B2`, `#101828`) that differ from the design system tokens (`#0891B2`, `#22D3EE`). Needs alignment. |

---

## Summary

| Category              | Count              |
| --------------------- | ------------------ |
| ✅ Completed features | ~25 major features |
| 🔲 Remaining (High)   | 6                  |
| 🔲 Remaining (Medium) | 9                  |
| 🔲 Remaining (Low)    | 12                 |

> [!TIP]
> The core CRUD loop (auth → trips → itinerary → expenses → votes) is fully wired end-to-end with both backend APIs and frontend UIs. The biggest gaps are **real-time collaboration**, **ML model training for cost estimation**, and **deployment infrastructure**.
