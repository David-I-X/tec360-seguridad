# OpenCode Instructions for Tec360 Seguridad

This repository contains the source code for Tec360 Seguridad. The codebase is a monorepo containing a FastAPI backend, a Next.js frontend, and a React Native mobile app (Expo).

## Architecture & Boundaries
- **Backend (`backend/`):** FastAPI + SQLModel + Pydantic. Relies on **PostgreSQL 15 + PostGIS** for the database (`postgis/postgis:15-3.3`).
- **Frontend (`frontend/`):** Next.js 15 App Router + Tailwind CSS. 
- **Mobile (`mobile/`):** React Native app using Expo and `expo-router`.
- **Skills:** Refer to `.agents/skills/*.md` files for deeper domain-specific guides on creating pages, endpoints, and running migrations.

## Current Work Streams (May 2026)
1. **Pruebas de Estrés** — `backend/locustfile.py` simula clientes, técnicos y WebSockets concurrentes. Se ejecuta con `locust -f locustfile.py` contra producción para encontrar la capacidad máxima del servidor.
2. **Verificación de Técnicos** — Rama `feature/technician-verification`. Sistema de documentos + quiz de conocimiento + niveles progresivos de acceso. Modifica el flujo de login/onboarding.
3. **Refinamiento de App** — UX/UI polish, correcciones de bugs, mejoras visuales generales.

## Key Modules (Recently Added)
- **Reputation System (`backend/app/services/reputation_service.py`):** Points-based ranking with 4 tiers (bronze/silver/gold/elite). Points are recalculated on every rating. Frontend components: `frontend/src/components/ui/tech-level.tsx` and `mobile/components/tech-level.tsx`.
- **Payments (`backend/app/api/payments.py`):** Cash payment registration by technicians, admin confirmation. Wompi integration deferred.
- **Stress Testing (`backend/locustfile.py`):** Locust script with ClientUser, TechUser, and WSUser profiles.

## Environment & Setup
- A `.env` file must exist in the root directory (see `.env.production.example` for the required structure).
- To start the local PostgreSQL database for development: `cd backend && docker-compose up -d`.
- **Dependencies:** The backend uses `libpq-dev` and `libgeos-dev`. Use the Docker container or ensure these system libraries are installed if running locally.
- **Stress testing deps:** `pip install locust websocket-client`

## Testing & Verification
### Backend
- Ensure the PostGIS database is running on port 5432 before testing.
- **Lint:** `cd backend && ruff check app/`
- **Test:** `cd backend && pytest tests/ -v --tb=short`
- **Stress:** `cd backend && locust -f locustfile.py` → open http://localhost:8089
- Order matters in CI: `backend-lint` -> `backend-test` -> `backend-build`

### Frontend
- **Lint:** `cd frontend && npx next lint`
- Frontend does not currently have a testing framework set up.

## Quirks & Conventions
### Backend
- **Migrations:** Alembic is the primary migration tool (`backend/alembic.ini`). Migrations are found in `backend/migrations/versions`.
- **WebSocket:** The backend has a realtime websocket component tracking technician locations (`backend/app/api/ws.py`).
- **Reputation:** When a client rates a service, `rating_service._update_technician_average()` triggers `reputation_service.recalculate()` to update `rank_points` and `rank` in the technician table.
- **Auth:** Login uses phone OTP (fixed code `123456` when `SMS_ENABLED=false`, real SMS via Twilio when `true`).

### Frontend
- **Global Navbar Offset:** The main container of any new page *must* include `pt-24` to account for the fixed global Navbar (`64px = 4rem + padding`).
- **Auth Wrapper:** Use the `fetchWithAuth` wrapper from `@/lib/api.ts` for all authenticated API calls.
- **Docker Build Args:** The frontend Dockerfile requires `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_GOOGLE_MAPS_KEY`, and `NEXT_PUBLIC_VAPID_PUBLIC_KEY` at build time.
- **TechLevel Component:** Use `<TechLevel rank="" points={} rating={} />` from `@/components/ui/tech-level.tsx` to display technician reputation badges.

### Mobile
- Uses `expo-router` for file-based routing. Styling uses standard React Native `StyleSheet` (no Nativewind). 
- Use `<Image>`, `react-native-maps`, and `expo-secure-store` for native counterparts to web technologies.
- **TechLevel Component:** Use `<TechLevel>` from `components/tech-level.tsx` for consistent rank display.
- **API fields:** Quotation API returns flat fields (`technician_rank`, `technician_rank_points`), not nested objects.