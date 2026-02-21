# 🛡️ Tec360 Seguridad

**Plataforma web que conecta usuarios con técnicos certificados del SENA para instalación y mantenimiento de sistemas de seguridad (GPS, alarmas, cámaras, cerraduras electrónicas) en toda Colombia.**

> Proyecto operado en la **Ruta del Emprendimiento 2025** por **Créame Incubadora de Empresas**.

---

## 📊 Estado del Proyecto

| Módulo | Estado | Detalles |
|--------|--------|----------|
| Autenticación (JWT + OTP por SMS) | ✅ | Registro, login, verificación por teléfono via Twilio |
| Gestión de Servicios | ✅ | CRUD completo, estados, asignación, paginación, filtros |
| Sistema de Cotizaciones | ✅ | Envío, aprobación, rechazo, contraoferta bilateral |
| Calificaciones | ✅ | Rating 1-5 estrellas + comentarios post-servicio |
| Notificaciones en Tiempo Real | ✅ | Eventos de servicio, cotizaciones, asignaciones |
| Geolocalización (Google Maps) | ✅ | Mapa interactivo, geocoding, autocomplete, tracking GPS |
| Tracking en Vivo (WebSocket) | ✅ | Posición del técnico en tiempo real estilo Uber |
| Subida de Imágenes | ✅ | Evidencias fotográficas del servicio |
| Docker / Producción | ✅ | Dockerfiles, Compose, Nginx, CI/CD |
| Sistema de Pagos | ❌ | No implementado (Wompi/Stripe pendiente) |
| App Móvil | ❌ | No iniciado |

---

## 🏗️ Arquitectura

```
             ┌──────────────────────────────────────────────┐
             │           Nginx (Reverse Proxy)             │
             │       :80/:443 — gzip, rate limiting        │
             └──────────┬───────────────┬──────────────────┘
                        │               │
                   /api/* , /ws/*       /*
                        │               │
              ┌─────────▼───────┐  ┌────▼──────────────┐
              │   FastAPI       │  │   Next.js 15       │
              │   Backend       │  │   Frontend         │
              │   :8000         │  │   :3000            │
              └────────┬────────┘  └───────────────────┘
                       │
              ┌────────▼────────┐
              │  PostgreSQL 15  │
              │  + PostGIS      │
              │  :5432          │
              └─────────────────┘
```

---

## 🧩 Stack Tecnológico

| Capa | Tecnologías |
|------|-------------|
| **Frontend** | Next.js 15, React 19, TypeScript, Framer Motion, Lucide Icons, shadcn/ui |
| **Backend** | FastAPI, Python 3.11, SQLModel, Pydantic v2, Gunicorn + Uvicorn |
| **Base de Datos** | PostgreSQL 15 + PostGIS (geoespacial) |
| **ORM / Migraciones** | SQLModel + SQLAlchemy + Alembic |
| **Auth** | JWT propio, bcrypt, OTP vía Twilio SMS |
| **Mapas** | Google Maps Platform (JavaScript API, Geocoding, Directions, Places) |
| **WebSocket** | Socket.IO (python-socketio / @socket.io/client) |
| **Infraestructura** | Docker, Docker Compose, Nginx, GitHub Actions CI/CD |

---

## 🧱 Estructura del Proyecto

```
tec360-seguridad/
│
├── backend/
│   ├── app/
│   │   ├── main.py                         # Entry point FastAPI
│   │   ├── api/                            # Endpoints (routers)
│   │   │   ├── auth.py                     #   Login, registro, OTP, onboarding
│   │   │   ├── services.py                 #   CRUD de servicios
│   │   │   ├── quotations.py               #   Cotizaciones (enviar, aprobar, rechazar, contraoferta)
│   │   │   ├── ratings.py                  #   Calificaciones
│   │   │   ├── notifications.py            #   Notificaciones
│   │   │   ├── technicians.py              #   Gestión de técnicos
│   │   │   ├── location.py                 #   Tracking GPS del técnico
│   │   │   ├── maps.py                     #   Proxy Google Maps
│   │   │   ├── images.py                   #   Subida de imágenes
│   │   │   ├── ws.py                       #   WebSocket (tracking en vivo)
│   │   │   └── simulate.py                 #   Simulación dev-only (excluido en producción)
│   │   ├── core/
│   │   │   ├── config.py                   #   Settings con Pydantic
│   │   │   ├── database.py                 #   Conexión SQLModel/PostgreSQL
│   │   │   ├── security.py                 #   JWT, middleware de roles
│   │   │   └── websocket_manager.py        #   Gestor de rooms Socket.IO
│   │   ├── models/                         # Modelos SQLModel (DB tables)
│   │   │   ├── user.py                     #   Usuario
│   │   │   ├── service.py                  #   Servicio
│   │   │   ├── technician.py               #   Perfil de técnico (PostGIS location)
│   │   │   ├── quotation.py                #   Cotización
│   │   │   ├── notification.py             #   Notificación
│   │   │   └── extras.py                   #   ServiceImage, ServiceRating
│   │   ├── schemas/                        # Schemas Pydantic (validación I/O)
│   │   └── services/                       # Capa de lógica de negocio
│   │       ├── service_service.py          #   Servicios
│   │       ├── quotation_service.py        #   Cotizaciones
│   │       ├── rating_service.py           #   Calificaciones
│   │       ├── notification_service.py     #   Notificaciones
│   │       ├── technician_service.py       #   Técnicos + stats + WKT parsing
│   │       ├── otp_service.py              #   Códigos OTP
│   │       ├── sms_service.py              #   Envío SMS via Twilio
│   │       ├── maps_service.py             #   Google Maps operations
│   │       └── image_service.py            #   Procesamiento de imágenes
│   ├── migrations/                         # Alembic
│   ├── Dockerfile                          # Producción: gunicorn + uvicorn
│   ├── requirements.txt
│   └── docker-compose.yml                  # PostgreSQL local (dev)
│
├── frontend/
│   ├── src/
│   │   ├── app/                            # Páginas (Next.js App Router)
│   │   │   ├── auth/phone/                 #   Solicitar OTP por teléfono
│   │   │   ├── auth/verify/                #   Verificar código OTP
│   │   │   ├── login/                      #   Login
│   │   │   ├── register/                   #   Registro
│   │   │   ├── servicios/                  #   Lista de servicios del cliente
│   │   │   ├── servicios/nuevo/            #   Crear servicio (con mapa)
│   │   │   ├── servicios/[id]/             #   Detalle de servicio
│   │   │   ├── servicios/[id]/cotizaciones #   Ver/gestionar cotizaciones recibidas
│   │   │   ├── tecnicos/dashboard/         #   Dashboard del técnico
│   │   │   ├── tecnicos/cotizar/[id]/      #   Enviar cotización a un servicio
│   │   │   ├── tecnicos/mis-cotizaciones/  #   Mis cotizaciones enviadas
│   │   │   ├── tecnicos/servicio/[id]/     #   Gestionar servicio activo + tracking
│   │   │   ├── tecnicos/trabajos/          #   Historial de trabajos
│   │   │   ├── error.tsx                   #   Error boundary global
│   │   │   └── not-found.tsx               #   404 personalizado
│   │   ├── components/
│   │   │   ├── ui/                         #   shadcn/ui primitivos
│   │   │   ├── auth/                       #   Onboarding form
│   │   │   ├── services/                   #   ServiceMap, LocationPicker, LiveTrackingView
│   │   │   ├── technician/                 #   TechnicianDashboard, ServiceCard
│   │   │   ├── quotations/                 #   QuotationCard
│   │   │   ├── ratings/                    #   RatingModal
│   │   │   ├── notifications/              #   NotificationBell (role-aware)
│   │   │   ├── navbar.tsx                  #   Navbar con nav por rol
│   │   │   ├── hero.tsx                    #   Landing hero
│   │   │   └── features.tsx                #   Landing features + footer
│   │   └── lib/
│   │       ├── api.ts                      #   HTTP client principal
│   │       ├── auth-context.tsx            #   AuthProvider, ProtectedRoute, PublicOnlyRoute
│   │       ├── quotations.ts               #   API client cotizaciones
│   │       ├── notifications.ts            #   API client notificaciones
│   │       ├── use-location-tracking.ts    #   Hook GPS tracking
│   │       └── validations.ts              #   Schemas Zod
│   ├── Dockerfile                          # Multi-stage standalone build
│   └── next.config.ts                      # output: 'standalone'
│
├── nginx/nginx.conf                        # Reverse proxy producción
├── docker-compose.prod.yml                 # Stack completo (DB + API + Web + Nginx)
├── .env.production.example                 # Template de variables
├── .github/workflows/
│   ├── ci.yml                              # Lint → Test → Build
│   └── deploy.yml                          # Tag → GHCR → SSH deploy
└── .gitignore
```

---

## 📡 API Endpoints

### Autenticación (`/auth`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auth/register` | Registro (email + password) |
| POST | `/auth/login` | Login |
| POST | `/auth/request-otp` | Solicitar código OTP por SMS |
| POST | `/auth/verify-otp` | Verificar código OTP |
| POST | `/auth/onboarding` | Completar perfil (rol, nombre, ubicación) |
| GET | `/auth/me` | Info del usuario autenticado |

### Servicios (`/services`)

| Método | Endpoint | Rol | Descripción |
|--------|----------|-----|-------------|
| POST | `/services` | client | Crear solicitud de servicio |
| GET | `/services` | todos | Listar servicios (filtrado por rol) |
| GET | `/services/{id}` | dueño/admin | Detalle de servicio |
| PATCH | `/services/{id}` | dueño/admin | Actualizar servicio |
| POST | `/services/{id}/accept` | technician | Aceptar servicio |
| PATCH | `/services/{id}/status` | technician | Cambiar estado |

### Cotizaciones (`/quotations`)

| Método | Endpoint | Rol | Descripción |
|--------|----------|-----|-------------|
| POST | `/quotations/service/{id}` | technician | Enviar cotización |
| GET | `/quotations/me` | technician | Mis cotizaciones enviadas |
| GET | `/quotations/service/{id}` | todos | Cotizaciones de un servicio |
| PATCH | `/quotations/{id}/approve` | client | Aprobar cotización |
| PATCH | `/quotations/{id}/reject` | client | Rechazar |
| PATCH | `/quotations/{id}/counter` | client | Contraoferta |
| PATCH | `/quotations/{id}/accept-counter` | technician | Aceptar contraoferta |
| PATCH | `/quotations/{id}/reject-counter` | technician | Rechazar contraoferta |

### Calificaciones (`/ratings`)

| Método | Endpoint | Rol |
|--------|----------|-----|
| POST | `/ratings/service/{id}` | client |
| GET | `/ratings/service/{id}` | todos |

### Notificaciones (`/notifications`)

| Método | Endpoint |
|--------|----------|
| GET | `/notifications` |
| GET | `/notifications/unread-count` |
| PATCH | `/notifications/{id}/read` |

### Location & Maps

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/location/{service_id}` | Enviar ubicación del técnico |
| GET | `/location/{service_id}` | Obtener última ubicación |
| POST | `/maps/geocode` | Dirección → coordenadas |
| POST | `/maps/reverse-geocode` | Coordenadas → dirección |

### WebSocket / Socket.IO

| Endpoint | Descripción |
|----------|-------------|
| `/ws/tracking/{service_id}` | Tracking en vivo del técnico |

### Health

| Endpoint | Descripción |
|----------|-------------|
| GET `/` | Status básico |
| GET `/health` | Health check con DB ping, uptime, features |

---

## 🔄 Flujos de Negocio

### Flujo de Cotización

```
Cliente crea servicio ──→ Estado: pending
     │
Técnico ve servicio disponible ──→ Envía cotización ──→ Estado: quoted
     │
Cliente recibe notificación ──→ Ve cotizaciones
     │
     ├── Aprobar ──→ Técnico asignado ──→ Estado: assigned
     ├── Rechazar ──→ Cotización rechazada
     └── Contraoferta ──→ Técnico evalúa
                              ├── Acepta ──→ Cliente ve nuevo precio
                              └── Rechaza ──→ Cotización cerrada
```

### Flujo de Servicio (post-asignación)

```
assigned ──→ en_route (técnico en camino, GPS en vivo)
         ──→ arrived (técnico llegó)
         ──→ in_progress (trabajo en curso)
         ──→ completed (servicio terminado)
         ──→ Cliente califica ⭐⭐⭐⭐⭐
```

### Tracking en Vivo (estilo Uber)

- **Marcador animado** con interpolación suave (`requestAnimationFrame`)
- **Ruta real por calles** via Google Directions API
- **ETA y distancia** calculados en tiempo real
- **Auto-seguimiento** del mapa al técnico
- **Fallback REST** si WebSocket falla (polling cada 8s)

---

## 🔐 Seguridad

| Medida | Implementación |
|--------|---------------|
| Autenticación | JWT + bcrypt, tokens de 7 días |
| OTP | SMS vía Twilio, expiración 5 min, máx 3 intentos |
| Roles | `client`, `technician`, `admin` — middleware por endpoint |
| CORS | Orígenes específicos (no `*` en producción) |
| Rate Limiting | Nginx: 30r/s general, 5r/min auth |
| Headers | X-Frame-Options, HSTS, X-Content-Type-Options |
| Docs | `/docs` y `/redoc` deshabilitados en producción |
| Rutas | `ProtectedRoute` y `PublicOnlyRoute` role-aware |
| Secrets | Validación que bloquea en producción si SECRET_KEY es default |

---

## ⚙️ Instalación Local

### Prerequisitos

- Python 3.11+
- Node.js 18+
- Docker (para PostgreSQL)
- Google Maps API Key
- Twilio Account (para SMS)

### 1. Clonar

```bash
git clone https://github.com/David-I-X/tec360-seguridad.git
cd tec360-seguridad
```

### 2. Base de datos

```bash
cd backend
docker compose up -d    # Levanta PostgreSQL + PostGIS en :5432
```

### 3. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/Mac

pip install -r requirements.txt

# Migraciones
alembic upgrade head

# Servidor
uvicorn app.main:app --reload
```

- API: http://localhost:8000
- Docs: http://localhost:8000/docs

### 4. Variables de entorno

Crear `.env` en la raíz:

```env
ENVIRONMENT=development
DEBUG=True
DATABASE_URL=postgresql://admin:password123@127.0.0.1:5432/tec360
SECRET_KEY=dev-secret-key

GOOGLE_MAPS_API_KEY=tu-api-key
TWILIO_ACCOUNT_SID=tu-sid
TWILIO_AUTH_TOKEN=tu-token
TWILIO_PHONE_NUMBER=+1234567890
```

Frontend `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=tu-api-key
```

### 5. Frontend

```bash
cd frontend
npm install
npm run dev
```

- App: http://localhost:3000

---

## 🐳 Docker (Producción)

```bash
# Copiar y llenar variables
cp .env.production.example .env.production

# Build y levantar
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# Migraciones
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head

# Verificar
curl http://localhost/health
```

---

## 🔄 CI/CD

| Pipeline | Trigger | Qué hace |
|----------|---------|----------|
| `ci.yml` | Push main / PRs | Ruff lint, pytest, Docker build |
| `deploy.yml` | Push tag `v*` | Build → GitHub Container Registry → SSH deploy |

```bash
# Deploy automático
git tag v1.0.0
git push origin v1.0.0
```

---

## 👨‍💻 Autor

**Oscar Nelson Vásquez Mieles**
Líder del emprendimiento **Tec360 Seguridad**
📧 oscarvasquezbroker@gmail.com
🏢 Ruta del Emprendimiento 2025 — Créame Incubadora de Empresas

---

## ⚡ Licencia

Proyecto bajo licencia **MIT**.

**Versión**: 1.0.0
**Última actualización**: Febrero 2026
