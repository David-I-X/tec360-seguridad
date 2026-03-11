---
name: Project Architecture
description: Understand the Tec360 Seguridad codebase structure, tech stack, and how the pieces connect.
---

# Tec360 Seguridad — Project Architecture

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Backend     | **FastAPI** + **SQLModel** + **Pydantic** |
| Database    | **PostgreSQL 15** + **PostGIS** (via `postgis/postgis:15-3.3`) |
| Frontend    | **Next.js 15** + **React 19** + **TypeScript** + **Tailwind CSS** |
| Realtime    | **WebSockets** (`websocket_manager.py` ↔ `websocket.ts`) |
| Auth        | **JWT** (access + refresh tokens) + **OTP via Twilio SMS** |
| Storage     | Local filesystem (`/opt/tec360-seguridad/uploads/`) served by Nginx |
| Proxy/SSL   | **Nginx** + **Certbot** (Let's Encrypt) |
| CI/CD       | **GitHub Actions** → Docker build → SSH deploy |
| Future      | **Expo / React Native** for mobile app |

## Directory Layout

```
tec360-seguridad/
├── backend/
│   ├── app/
│   │   ├── api/           # FastAPI routers (16 modules)
│   │   ├── core/          # config, auth_utils, websocket_manager
│   │   ├── models/        # SQLModel ORM models
│   │   ├── schemas/       # Pydantic request/response schemas
│   │   └── services/      # Business logic services
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/           # Next.js App Router pages
│   │   ├── components/    # Reusable UI components
│   │   └── lib/           # Utilities (api.ts, auth-context, websocket.ts)
│   ├── Dockerfile
│   └── package.json
├── nginx/
│   └── nginx.conf         # Reverse proxy config
├── docker-compose.prod.yml
├── .github/workflows/     # CI/CD pipeline
└── docs/                  # migration_guide.md, etc.
```

## Backend API Modules (`backend/app/api/`)

| Module              | Purpose                                    |
|---------------------|--------------------------------------------|
| `auth.py`           | OTP request/verify, JWT refresh, onboarding |
| `services.py`       | CRUD for service requests                  |
| `technicians.py`    | Technician marketplace, profiles           |
| `quotations.py`     | Quote creation, acceptance                 |
| `ratings.py`        | Rating system                              |
| `uploads.py`        | File uploads (avatars, service photos, vehicle photos) |
| `users.py`          | User profile management                   |
| `admin.py`          | Admin dashboard endpoints                  |
| `location.py`       | GPS location updates                       |
| `ws.py`             | WebSocket endpoint handler                 |
| `notifications.py`  | Push/in-app notifications                  |
| `maps.py`           | Google Maps integration                    |
| `images.py`         | Image processing                           |

## Frontend Routes (`frontend/src/app/`)

| Route                          | Purpose                          |
|--------------------------------|----------------------------------|
| `/`                            | Landing page (Hero + Features)   |
| `/login`, `/register`          | Authentication flow              |
| `/auth/phone`, `/auth/verify`  | OTP phone verification           |
| `/servicios`                   | Client service list              |
| `/servicios/nuevo`             | New service request form         |
| `/servicios/[id]`              | Service detail + LiveTrackingView|
| `/servicios/[id]/esperando`    | Waiting for technician screen    |
| `/servicios/[id]/cotizaciones` | View and accept quotes           |
| `/tecnicos/dashboard`          | Technician dashboard             |
| `/tecnicos/servicio/[id]`      | Technician active service view   |
| `/tecnicos/perfil/[id]`        | Public technician profile        |
| `/admin`                       | Admin panel                      |
| `/configuracion`               | User settings                    |

## Key Patterns

1. **Authentication**: JWT access tokens (30 min) + refresh tokens (30 days). `fetchWithAuth()` wrapper auto-refreshes on 401.
2. **Real-time**: WebSocket manager broadcasts `status_update` and `location_update` events to service rooms.
3. **Image uploads**: Client-side compression via canvas → FormData → `/uploads/*` endpoints. Nginx serves static files from the shared volume.
4. **Global Navbar**: Rendered in `app/layout.tsx`, always visible. Shows user avatar if available.

## Environment Variables

Core variables needed (see `.env.production.example`):
- `DATABASE_URL`, `SECRET_KEY`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- `GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_API_URL` (frontend → backend)
- `EXTRA_CORS_ORIGINS` (for native apps)
