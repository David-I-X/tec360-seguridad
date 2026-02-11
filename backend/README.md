# 🔧 Tec360 Seguridad — Backend

API REST construida con **FastAPI** + **SQLModel** + **PostgreSQL/PostGIS**.

---

## ⚠️ Funcionalidad Pendiente

> **Sistema de Pagos (C2) NO implementado.** No existe integración con Wompi/Stripe.
> El flujo termina con la aprobación de cotización y asignación del técnico.

---

## 📦 Tech Stack

- **FastAPI** — Framework web async
- **SQLModel** — ORM (SQLAlchemy + Pydantic)
- **PostgreSQL 15 + PostGIS** — BD con soporte geoespacial
- **Alembic** — Migraciones de BD
- **Pydantic v2** — Validación de datos
- **JWT + bcrypt** — Autenticación
- **WebSocket** — Tracking en vivo

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
│   ├── auth.py          # /auth — registro, login, onboarding
│   ├── services.py      # /services — CRUD de servicios
│   ├── quotations.py    # /quotations — cotizaciones + contraofertas
│   ├── ratings.py       # /ratings — calificaciones
│   ├── notifications.py # /notifications — sistema de notificaciones
│   ├── technicians.py   # /technicians — perfiles, búsqueda
│   ├── location.py      # /location — tracking de ubicación
│   ├── maps.py          # /maps — proxy Google Maps API
│   ├── images.py        # /images — subida de imágenes
│   └── ws.py            # WebSocket — tracking en vivo
├── core/
│   ├── config.py        # Settings (Pydantic)
│   ├── database.py      # Sesión SQLModel
│   └── security.py      # JWT, roles, middleware
├── models/              # Tablas (SQLModel)
│   ├── user.py
│   ├── service.py
│   ├── technician.py
│   ├── quotation.py
│   ├── notification.py
│   └── extras.py        # ServiceImage, ServiceRating
├── schemas/             # Request/Response schemas
│   ├── service.py
│   └── quotation.py
└── services/            # Lógica de negocio
    ├── quotation_service.py
    ├── rating_service.py
    └── notification_service.py
```

---

## 📡 Endpoints Principales

### Auth
- `POST /auth/register` — Registro
- `POST /auth/login` — Login
- `POST /auth/onboarding` — Completar perfil
- `GET /auth/me` — Usuario actual

### Servicios
- `POST /services` — Crear servicio (client)
- `GET /services` — Listar (filtrado por rol)
- `GET /services/{id}` — Detalle
- `PATCH /services/{id}/status` — Cambiar estado (technician)
- `POST /services/{id}/accept` — Aceptar (technician)

### Cotizaciones
- `POST /quotations/service/{id}` — Enviar cotización (technician)
- `GET /quotations/me` — Mis cotizaciones (technician)
- `GET /quotations/service/{id}` — Ver cotizaciones
- `PATCH /quotations/{id}/approve` — Aprobar (client)
- `PATCH /quotations/{id}/reject` — Rechazar (client)
- `PATCH /quotations/{id}/counter` — Contraoferta (client)
- `PATCH /quotations/{id}/accept-counter` — Aceptar contraoferta (technician)
- `PATCH /quotations/{id}/reject-counter` — Rechazar contraoferta (technician)

### Rating & Notificaciones
- `POST /ratings/service/{id}` — Calificar
- `GET /notifications` — Listar notificaciones
- `GET /notifications/unread-count` — No leídas

### WebSocket
- `ws://host/ws/tracking/{service_id}` — Tracking en vivo

---

## 🧪 Tests

```bash
pytest tests/ -v
pytest --cov=app --cov-report=html
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

**Versión**: 0.5.0 | **Última actualización**: Febrero 2026