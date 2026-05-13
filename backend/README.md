# 🔧 Tec360 Seguridad — Backend

API REST construida con **FastAPI** + **SQLModel** + **PostgreSQL/PostGIS**.

---

## 📦 Tech Stack

- **FastAPI** — Framework web async
- **SQLModel** — ORM (SQLAlchemy + Pydantic)
- **PostgreSQL 15 + PostGIS** — BD con soporte geoespacial
- **Alembic** — Migraciones de BD
- **Pydantic v2** — Validación de datos
- **JWT + bcrypt** — Autenticación
- **WebSocket** — Tracking en vivo
- **Locust** — Pruebas de estrés (load testing)

---

## 🚀 Instalación

### 1. PostgreSQL con Docker
```bash
docker-compose up -d
```

### 2. Entorno virtual
```bash
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

### 3. Variables de entorno
Crear `.env` en la raíz del proyecto:
```env
ENVIRONMENT=development
DEBUG=True
SECRET_KEY=tu-secret-key
SMS_ENABLED=false
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tec360
GOOGLE_MAPS_API_KEY=tu-google-api-key
```

### 4. Migraciones
```bash
alembic upgrade head
```

### 5. Ejecutar
```bash
uvicorn app.main:app --reload
```
- API: http://localhost:8000
- Swagger: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## 🗂️ Estructura

```
app/
├── main.py              # Entrada, CORS, routers
├── api/                 # Endpoints
│   ├── auth.py          # /auth — OTP login, onboarding
│   ├── services.py      # /services — CRUD de servicios
│   ├── quotations.py    # /quotations — cotizaciones + contraofertas
│   ├── ratings.py       # /ratings — calificaciones bidireccionales
│   ├── reputation.py    # /reputation — puntos y niveles de técnico
│   ├── payments.py      # /payments — registro de pagos en efectivo
│   ├── notifications.py # /notifications — sistema de notificaciones
│   ├── technicians.py   # /technicians — perfiles, búsqueda
│   ├── location.py      # /location — tracking de ubicación
│   ├── maps.py          # /maps — proxy Google Maps API
│   ├── images.py        # /images — subida de imágenes
│   ├── uploads.py       # /uploads — gestión de archivos
│   └── ws.py            # WebSocket — tracking en vivo
├── core/
│   ├── config.py        # Settings (Pydantic)
│   ├── database.py      # Sesión SQLModel
│   ├── security.py      # JWT, roles, middleware
│   └── websocket_manager.py # Gestor de conexiones WS
├── models/              # Tablas (SQLModel)
│   ├── user.py          # User (cliente, técnico, admin)
│   ├── service.py       # Service + ServiceStatus
│   ├── technician.py    # Technician + TechnicianRank + calculate_rank_points
│   ├── quotation.py     # Quotation + QuotationStatus
│   ├── payment.py       # Payment + PaymentStatus
│   ├── notification.py  # Notification
│   └── extras.py        # ServiceImage, ServiceRating
├── schemas/             # Request/Response schemas
│   ├── service.py
│   ├── quotation.py
│   ├── rating.py
│   ├── reputation.py    # TechnicianReputation + PointsBreakdown
│   └── payment.py
└── services/            # Lógica de negocio
    ├── quotation_service.py
    ├── rating_service.py
    ├── reputation_service.py  # Recálculo de puntos y rank
    ├── payment_service.py
    ├── notification_service.py
    └── sms_service.py
```

---

## 📡 Endpoints Principales

### Auth
- `POST /auth/request-otp` — Solicitar código de verificación
- `POST /auth/verify-otp` — Verificar código y login
- `POST /auth/onboarding` — Completar perfil (nombre, rol)
- `POST /auth/refresh` — Renovar tokens
- `GET /auth/me` — Usuario actual

### Servicios
- `POST /services` — Crear servicio (client)
- `GET /services` — Listar (filtrado por rol)
- `GET /services/{id}` — Detalle
- `GET /services/my-services` — Mis servicios
- `PATCH /services/{id}/status` — Cambiar estado (technician)

### Cotizaciones
- `POST /quotations/service/{id}` — Enviar cotización (technician)
- `GET /quotations/me` — Mis cotizaciones (technician)
- `GET /quotations/service/{id}` — Ver cotizaciones de un servicio
- `PATCH /quotations/{id}/approve` — Aprobar (client)
- `PATCH /quotations/{id}/reject` — Rechazar (client)
- `PATCH /quotations/{id}/counter` — Contraoferta (client)
- `PATCH /quotations/{id}/accept-counter` — Aceptar contraoferta (technician)
- `PATCH /quotations/{id}/reject-counter` — Rechazar contraoferta (technician)

### Reputación
- `GET /reputation/{technician_id}` — Puntos, nivel y desglose de un técnico

### Pagos
- `POST /payments/cash/{service_id}` — Registrar pago en efectivo (technician)
- `GET /payments/my-summary` — Resumen financiero (technician)
- `GET /payments/my-history` — Historial de pagos (technician)

### Rating & Notificaciones
- `POST /ratings/service/{id}` — Calificar servicio
- `GET /ratings/technician/{id}` — Ratings de un técnico
- `GET /ratings/services/{id}/can-rate` — ¿Puede calificar?
- `GET /notifications` — Listar notificaciones
- `GET /notifications/unread-count` — No leídas

### WebSocket
- `ws://host/ws/service/{service_id}?token=` — Tracking en vivo (ubicación + estado)
- `ws://host/ws/user?token=` — Canal personal de notificaciones

---

## 🧪 Tests

```bash
# Lint
ruff check app/

# Tests
pytest tests/ -v --tb=short

# Con cobertura
pytest --cov=app --cov-report=html
```

## 🔥 Pruebas de Estrés

```bash
pip install locust websocket-client
locust -f locustfile.py
# Abrir http://localhost:8089
```

---

## 📋 Migraciones

```bash
# Crear nueva migración
alembic revision --autogenerate -m "descripcion"

# Aplicar migraciones
alembic upgrade head

# Revertir última
alembic downgrade -1
```

---

**Versión**: 0.8.0 | **Última actualización**: Mayo 2026