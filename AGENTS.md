# OpenCode Instructions for Tec360 Seguridad

This repository contains the source code for Tec360 Seguridad. The codebase is a monorepo containing a FastAPI backend, a Next.js frontend, and a React Native mobile app (Expo).

## Architecture & Boundaries
- **Backend (`backend/`):** FastAPI + SQLModel + Pydantic. Relies on **PostgreSQL 15 + PostGIS** for the database (`postgis/postgis:15-3.3`).
- **Frontend (`frontend/`):** Next.js 15 App Router + Tailwind CSS. 
- **Mobile (`mobile/`):** React Native app using Expo and `expo-router`.
- **Skills:** Refer to `.agents/skills/*.md` files for deeper domain-specific guides on creating pages, endpoints, and running migrations.

## Environment & Setup
- A `.env` file must exist in the root directory (see `.env.production.example` for the required structure).
- To start the local PostgreSQL database for development: `cd backend && docker-compose up -d`.
- **Dependencies:** The backend uses `libpq-dev` and `libgeos-dev`. Use the Docker container or ensure these system libraries are installed if running locally.

## Testing & Verification
### Backend
- Ensure the PostGIS database is running on port 5432 before testing.
- **Lint:** `cd backend && ruff check app/`
- **Test:** `cd backend && pytest tests/ -v --tb=short`
- Order matters in CI: `backend-lint` -> `backend-test` -> `backend-build`

### Frontend
- **Lint:** `cd frontend && npx next lint`
- Frontend does not currently have a testing framework set up.

## Quirks & Conventions
### Backend
- **Migrations:** Alembic is the primary migration tool (`backend/alembic.ini`). Migrations are found in `backend/migrations/versions`.
- **WebSocket:** The backend has a realtime websocket component tracking technician locations (`backend/app/api/ws.py`).

### Frontend
- **Global Navbar Offset:** The main container of any new page *must* include `pt-24` to account for the fixed global Navbar (`64px = 4rem + padding`).
- **Auth Wrapper:** Use the `fetchWithAuth` wrapper from `@/lib/api.ts` for all authenticated API calls.
- **Docker Build Args:** The frontend Dockerfile requires `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_GOOGLE_MAPS_KEY`, and `NEXT_PUBLIC_VAPID_PUBLIC_KEY` at build time.

### Mobile
- Uses `expo-router` for file-based routing. Styling uses standard React Native `StyleSheet` (no Nativewind). 
- Use `<Image>`, `react-native-maps`, and `expo-secure-store` for native counterparts to web technologies.