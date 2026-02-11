# 🚀 Tec360 Seguridad

**Tec360 Seguridad** es una plataforma web que conecta usuarios con técnicos certificados del SENA para la instalación y mantenimiento de sistemas de seguridad (GPS, alarmas, cámaras, etc.) en toda Colombia.

---

## ⚠️ Advertencia — Funcionalidades Pendientes

> [!CAUTION]
> **Sistema de Pagos (C2) NO implementado.** La integración con Wompi/Stripe para procesamiento de pagos **no se ha desarrollado**. El flujo actual termina con la aprobación de cotización y asignación del técnico, sin incluir cobro ni facturación.

> [!WARNING]
> - No existe integración con pasarela de pagos
> - No hay generación de facturas
> - App móvil (React Native/Flutter) no iniciada
> - No hay CI/CD configurado para producción
> - Rate limiting no implementado

---

## 📊 Estado del Proyecto (Febrero 2026)

| Módulo | Estado | Descripción |
|--------|--------|-------------|
| **Autenticación y Roles** | ✅ Completo | JWT, login, registro, onboarding, roles (client/technician/admin) |
| **Gestión de Servicios** | ✅ Completo | CRUD, asignación, tracking de estado, paginación, filtros |
| **Sistema de Cotizaciones** | ✅ Completo | Envío, aprobación, rechazo, contraoferta, gestión bilateral |
| **Sistema de Calificaciones** | ✅ Completo | Rating 1-5 estrellas con comentarios |
| **Notificaciones** | ✅ Completo | Notificaciones en tiempo real, contador de no leídas |
| **Geolocalización (Google Maps)** | ✅ Completo | Mapa interactivo, geocoding, autocomplete, tracking en vivo |
| **Tracking en Vivo (WebSocket)** | ✅ Completo | Ubicación del técnico en tiempo real vía WebSocket |
| **Frontend Web** | ✅ Completo | Next.js 15 + React 19, dashboards cliente y técnico |
| **Subida de Imágenes** | ✅ Completo | Evidencias fotográficas con Supabase Storage |
| **Sistema de Pagos** | ❌ No iniciado | Integración con Wompi/Stripe pendiente |
| **App Móvil** | ❌ No iniciado | React Native / Flutter |

---

## 🏗️ Arquitectura del Sistema

```
Usuario (Cliente / Técnico)
        │
        ▼
[Frontend: Next.js 15 + React 19]  →  Desarrollo local (puerto 3000)
        │
        ▼
[Backend: FastAPI + SQLModel]  →  Desarrollo local (puerto 8000)
        │
        ▼
[PostgreSQL + PostGIS]  →  Docker / Supabase
        │
        ├── Autenticación JWT
        ├── Geolocalización PostGIS
        ├── Migraciones Alembic
        └── WebSocket para tracking en vivo
        │
        ▼
[APIs Externas: Google Maps Platform]
```

---

## 🧩 Stack Tecnológico

| Capa | Tecnología | Estado |
|------|------------|--------|
| **Frontend** | Next.js 15, React 19, TypeScript, Framer Motion, Lucide Icons | ✅ |
| **Backend** | FastAPI, Python 3.11+, SQLModel, Pydantic v2 | ✅ |
| **Base de datos** | PostgreSQL 15 + PostGIS (Docker) | ✅ |
| **ORM** | SQLModel + SQLAlchemy | ✅ |
| **Migraciones** | Alembic | ✅ |
| **Auth** | JWT (propio), bcrypt | ✅ |
| **Mapas** | Google Maps Platform (JavaScript API, Geocoding, Places) | ✅ |
| **WebSocket** | FastAPI WebSocket para tracking en vivo | ✅ |
| **Pagos** | Wompi / Stripe | ❌ Pendiente |

---

## 🧱 Estructura del Proyecto

```
tec360-seguridad/
│
├── backend/
│   ├── app/
│   │   ├── main.py                        # Punto de entrada FastAPI
│   │   ├── api/                           # Endpoints (routers)
│   │   │   ├── auth.py                    # Login, registro, onboarding
│   │   │   ├── services.py               # CRUD de servicios
│   │   │   ├── quotations.py             # Sistema de cotizaciones
│   │   │   ├── ratings.py                # Calificaciones
│   │   │   ├── notifications.py          # Notificaciones
│   │   │   ├── technicians.py            # Gestión de técnicos
│   │   │   ├── location.py               # Tracking de ubicación
│   │   │   ├── maps.py                   # Google Maps proxy
│   │   │   ├── images.py                 # Subida de imágenes
│   │   │   └── ws.py                     # WebSocket (tracking en vivo)
│   │   ├── core/                          # Configuración
│   │   │   ├── config.py                 # Settings con Pydantic
│   │   │   ├── database.py               # Conexión SQLModel/PostgreSQL
│   │   │   └── security.py               # Auth JWT, middleware de roles
│   │   ├── models/                        # Modelos SQLModel
│   │   │   ├── user.py                   # Usuario
│   │   │   ├── service.py                # Servicio
│   │   │   ├── technician.py             # Perfil técnico
│   │   │   ├── quotation.py              # Cotización
│   │   │   ├── notification.py           # Notificación
│   │   │   └── extras.py                 # ServiceImage, ServiceRating
│   │   ├── schemas/                       # Schemas Pydantic (validación)
│   │   │   ├── service.py
│   │   │   └── quotation.py
│   │   └── services/                      # Capa de lógica de negocio
│   │       ├── quotation_service.py
│   │       ├── rating_service.py
│   │       └── notification_service.py
│   ├── migrations/                        # Alembic
│   │   └── versions/                      # Scripts de migración
│   │       ├── 4181c55ae5fe_initial_migration.py
│   │       ├── 1bb3158b3c3f_add_notifications_table.py
│   │       ├── 4b4e043f0a72_add_scheduled_date_to_services.py
│   │       ├── add_new_service_statuses.py
│   │       ├── create_quotations.py
│   │       ├── create_service_ratings.py
│   │       └── create_technicians.py
│   ├── tests/                             # Tests con Pytest
│   ├── requirements.txt                   # Dependencias Python
│   ├── docker-compose.yml                 # PostgreSQL + PostGIS local
│   └── alembic.ini                        # Config de migraciones
│
├── frontend/
│   ├── src/
│   │   ├── app/                           # Páginas (App Router)
│   │   │   ├── auth/                      # Flujo de autenticación
│   │   │   ├── login/                     # Página de login
│   │   │   ├── register/                  # Página de registro
│   │   │   ├── servicios/                 # Servicios del cliente
│   │   │   │   ├── page.tsx              # Lista de servicios
│   │   │   │   ├── nuevo/                # Crear servicio (con mapa)
│   │   │   │   └── [id]/                 # Detalle + cotizaciones
│   │   │   │       └── cotizaciones/     # Ver/gestionar cotizaciones
│   │   │   ├── tecnicos/                  # Páginas del técnico
│   │   │   │   ├── cotizar/[id]/         # Enviar cotización
│   │   │   │   ├── mis-cotizaciones/     # Gestión de cotizaciones
│   │   │   │   └── servicio/[id]/        # Tracking de servicio
│   │   │   ├── mapa/                      # Mapa interactivo
│   │   │   ├── resenas/                   # Reseñas
│   │   │   └── imagenes/                  # Gestión de imágenes
│   │   ├── components/                    # Componentes reutilizables
│   │   │   ├── ui/                        # shadcn/ui components
│   │   │   ├── services/                  # Componentes de servicios
│   │   │   ├── technician/                # Dashboard técnico
│   │   │   ├── quotations/                # Cards de cotización
│   │   │   └── ratings/                   # Modal de calificación
│   │   └── lib/                           # Utilidades
│   │       ├── api.ts                     # API client principal
│   │       ├── auth-context.tsx           # Context de autenticación
│   │       └── quotations.ts             # API client de cotizaciones
│   ├── package.json
│   └── README.md
│
├── .env                                   # Variables de entorno (NO subir)
├── .gitignore
└── tec360_readme_updated.md               # Este archivo
```

---

## 📡 API Endpoints

### Autenticación (`/auth`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auth/register` | Registro de usuario |
| POST | `/auth/login` | Inicio de sesión |
| POST | `/auth/onboarding` | Completar perfil (rol, ubicación) |
| GET | `/auth/me` | Info del usuario actual |

### Servicios (`/services`)
| Método | Endpoint | Rol | Descripción |
|--------|----------|-----|-------------|
| POST | `/services` | client | Crear solicitud de servicio |
| GET | `/services` | todos | Listar servicios (filtrado por rol) |
| GET | `/services/{id}` | dueño/admin | Detalle de servicio |
| PATCH | `/services/{id}` | dueño/admin | Actualizar servicio |
| POST | `/services/{id}/accept` | technician | Aceptar servicio |
| PATCH | `/services/{id}/status` | technician | Cambiar estado del servicio |

### Cotizaciones (`/quotations`)
| Método | Endpoint | Rol | Descripción |
|--------|----------|-----|-------------|
| POST | `/quotations/service/{id}` | technician | Enviar cotización |
| GET | `/quotations/me` | technician | Mis cotizaciones enviadas |
| GET | `/quotations/service/{id}` | todos | Cotizaciones de un servicio |
| PATCH | `/quotations/{id}/approve` | client | Aprobar cotización |
| PATCH | `/quotations/{id}/reject` | client | Rechazar cotización |
| PATCH | `/quotations/{id}/counter` | client | Hacer contraoferta |
| PATCH | `/quotations/{id}/accept-counter` | technician | Aceptar contraoferta |
| PATCH | `/quotations/{id}/reject-counter` | technician | Rechazar contraoferta |

### Calificaciones (`/ratings`)
| Método | Endpoint | Rol | Descripción |
|--------|----------|-----|-------------|
| POST | `/ratings/service/{id}` | client | Calificar servicio |
| GET | `/ratings/service/{id}` | todos | Ver calificaciones |

### Notificaciones (`/notifications`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/notifications` | Listar notificaciones |
| GET | `/notifications/unread-count` | Contador no leídas |
| PATCH | `/notifications/{id}/read` | Marcar como leída |

### WebSocket
| Endpoint | Descripción |
|----------|-------------|
| `ws://host/ws/tracking/{service_id}` | Tracking en vivo del técnico |

---

## ⚙️ Instalación Local

### Prerequisitos
- Python 3.11+
- Node.js 18+ (o Docker para frontend)
- Docker (para PostgreSQL)
- Google Maps API Key

### 1. Clonar repositorio
```bash
git clone https://github.com/David-I-X/tec360-seguridad.git
cd tec360-seguridad
```

### 2. Base de datos (Docker)
```bash
cd backend
docker-compose up -d
```

### 3. Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate            # Windows
# source venv/bin/activate       # Linux/Mac
pip install -r requirements.txt

# Aplicar migraciones
alembic upgrade head

# Ejecutar servidor
uvicorn app.main:app --reload
```
- API: http://localhost:8000
- Docs: http://localhost:8000/docs

### 4. Variables de entorno
Crear `.env` en la raíz:
```env
ENVIRONMENT=development
DEBUG=True
SECRET_KEY=tu-secret-key-seguro

# Base de datos
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tec360

# Google Maps
GOOGLE_MAPS_API_KEY=tu-api-key
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

## 🔄 Flujos Principales

### Flujo de Cotización
```
1. Cliente crea servicio (estado: pending)
2. Técnico ve servicio disponible → envía cotización (estado: quoted)
3. Cliente recibe notificación → ve cotizaciones
4. Cliente puede:
   a) Aprobar → técnico asignado (estado: assigned)
   b) Rechazar → cotización rechazada
   c) Contraoferta → técnico recibe nueva propuesta
5. Técnico acepta/rechaza contraoferta
6. Si acepta → vuelve a paso 3 con nuevo precio
```

### Flujo de Servicio (post-asignación)
```
1. Técnico asignado (assigned)
2. Técnico en camino (en_route) → tracking GPS en vivo
3. Técnico llegó (arrived)
4. Servicio en progreso (in_progress)
5. Servicio completado (completed)
6. Cliente califica con estrellas
```

---

## 🔒 Seguridad

### Implementado
- ✅ JWT con bcrypt para autenticación
- ✅ Roles diferenciados (client, technician, admin)
- ✅ Middleware de autorización por rol en endpoints
- ✅ Validación de datos con Pydantic v2
- ✅ CORS configurado
- ✅ `.gitignore` configurado

### Pendiente
- ❌ Rate limiting
- ❌ HTTPS en producción
- ❌ Logging centralizado / Sentry
- ❌ Backups automáticos de BD

---

## 👨‍💻 Autor

**Oscar Nelson Vásquez Mieles**
Líder del emprendimiento **Tec360 Seguridad**
📧 oscarvasquezbroker@gmail.com
🏢 Operado en la **Ruta del Emprendimiento 2025** por **Créame Incubadora de Empresas**

---

## ⚡ Licencia

Proyecto bajo licencia **MIT**.

---

**Última actualización**: Febrero 2026
**Versión**: 0.5.0 (MVP funcional — sin pagos)
