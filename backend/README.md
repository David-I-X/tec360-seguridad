# 🐍 Tec360 Seguridad — Backend API

API REST y WebSocket para la plataforma de seguridad vehicular Tec360.

> 📡 Producción: `https://tec-360.tech/api`
> 📖 Docs interactivos: `https://tec-360.tech/api/docs`

---

## 🛠️ Stack

| Tecnología | Versión | Uso |
|-----------|---------|-----|
| FastAPI | 0.115 | Framework API REST + WebSocket |
| SQLModel | 0.22 | ORM (SQLAlchemy + Pydantic) |
| PostgreSQL | 15 | Base de datos relacional |
| PostGIS | — | Extensión geoespacial (coords técnicos) |
| Alembic | — | Migraciones de base de datos |
| JWT | — | Autenticación con tokens |
| SlowAPI | — | Rate limiting (30 req/min) |
| Twilio | — | Envío de SMS para OTP |
| WebSockets | — | Chat en tiempo real + GPS streaming |

---

## 📡 Módulos de la API

La API está organizada en **21 routers** dentro de `app/api/`:

| Router | Archivo | Endpoints principales |
|--------|---------|----------------------|
| 🔐 **Auth** | `auth.py` | OTP envío/verificación, onboarding, refresh tokens |
| 🔧 **Services** | `services.py` | CRUD de servicios, ciclo de vida, transiciones de estado, técnicos cercanos, evidencia, reportes PDF |
| 📋 **Quotations** | `quotations.py` | Crear cotización, contra-oferta, aceptar/rechazar |
| ⭐ **Ratings** | `ratings.py` | Crear calificación, estadísticas, reseñas de técnicos |
| 🏆 **Reputation** | `reputation.py` | Score, rango, historial de reputación |
| 👨‍🔧 **Technicians** | `technicians.py` | Perfil, disponibilidad, documentos, quiz, horarios |
| 💰 **Payments** | `payments.py` | Confirmación efectivo, pagos de servicio, validación admin |
| 💳 **Credits** | `credits.py` | Wallet: saldo, historial, compra, asignación admin |
| 🛡️ **Admin** | `admin.py` | Gestión usuarios, servicios, estadísticas, dashboard |
| 💬 **Chat** | `chat.py` | Mensajes de servicio en tiempo real |
| 🔔 **Notifications** | `notifications.py` | Suscripción push, listar, marcar leído |
| 📸 **Uploads** | `uploads.py` | Fotos de servicio, avatares |
| 📤 **Images** | `images.py` | Servir imágenes estáticas |
| 📍 **Location** | `location.py` | Tracking GPS, ubicación del técnico |
| 🗺️ **Maps** | `maps.py` | Integración Google Maps, geocoding |
| 🔗 **Webhooks** | `webhooks.py` | Callbacks SaaS vertical |
| 🧪 **Simulate** | `simulate.py` | Endpoints de testing para desarrollo |
| 👤 **Users** | `users.py` | Gestión de perfiles de usuario |
| ✅ **Verification** | `verification.py` | Verificación de técnicos y documentos |
| 🌐 **WebSocket** | `ws.py` | Manager WebSocket (chat + GPS) |
| 📄 **Example** | `example.py` | Endpoints de ejemplo/referencia |

---

## 🗄️ Modelos de Base de Datos

Se encuentran en `app/models/` — **14 archivos de modelos**:

| Modelo | Archivo | Descripción |
|--------|---------|-------------|
| `User` | `user.py` | Usuarios (clientes, técnicos, admin) |
| `Technician` | `technician.py` | Perfil extendido del técnico (nivel, documentos, GPS) |
| `Service` | `service.py` | Servicios solicitados (GPS, alarma, dashcam, etc.) |
| `Quotation` | `quotation.py` | Cotizaciones y contra-ofertas |
| `Payment` | `payment.py` | Registro de pagos (efectivo, transferencia) |
| `Credit` | `credit.py` | Wallet de créditos del técnico |
| `Message` | `message.py` | Mensajes del chat por servicio |
| `Notification` | `notification.py` | Notificaciones push/in-app |
| `PushToken` | `push_token.py` | Tokens de dispositivo para push |
| `Incident` | `incident.py` | Reportes de incidentes |
| `Schedule` | `schedule.py` | Horarios de disponibilidad |
| `Portfolio` | `portfolio.py` | Portafolio de trabajos del técnico |
| `Verification` | `verification.py` | Documentos y estado de verificación |
| `Extras` | `extras.py` | Modelos auxiliares (metadatos de servicio, etc.) |

---

## ⚙️ Capa de Servicios

Lógica de negocio en `app/services/` — **17 archivos**:

| Servicio | Archivo | Responsabilidad |
|----------|---------|-----------------|
| 📲 OTP | `otp_service.py` | Generación y validación de códigos OTP |
| 📱 SMS | `sms_service.py` | Envío de SMS vía Twilio |
| 🔧 Servicios | `service_service.py` | Ciclo de vida completo del servicio |
| 📋 Cotizaciones | `quotation_service.py` | Lógica de cotización y contra-oferta |
| ⭐ Calificaciones | `rating_service.py` | Calificaciones bidireccionales |
| 🏆 Reputación | `reputation_service.py` | Cálculo de score y niveles |
| 👨‍🔧 Técnicos | `technician_service.py` | Perfil, disponibilidad, búsqueda cercana |
| ✅ Verificación | `verification_service.py` | Validación de documentos y quiz |
| 💰 Pagos | `payment_service.py` | Procesamiento de pagos |
| 💳 Créditos | `credit_service.py` | Wallet, compra y asignación de créditos |
| 🔔 Notificaciones | `notification_service.py` | Creación y envío de notificaciones |
| 📤 Push | `push_service.py` | Envío de push notifications (VAPID + Expo) |
| 🖼️ Imágenes | `image_service.py` | Upload y procesamiento de imágenes |
| 📄 PDF | `pdf_service.py` | Generación de reportes PDF |
| 🗺️ Maps | `maps_service.py` | Integración Google Maps, geocoding, rutas |
| 🔗 SaaS | `sas_service.py` | Integración con servicios SaaS externos |
| 📝 Quiz Seed | `quiz_seed.py` | Datos semilla para el quiz de técnicos |

---

## 🗃️ Migraciones

**17 migraciones** gestionadas con Alembic en `migrations/versions/`:

```bash
# Ver estado actual
alembic current

# Aplicar todas las migraciones pendientes
alembic upgrade head

# Crear nueva migración
alembic revision --autogenerate -m "descripción del cambio"

# Revertir última migración
alembic downgrade -1
```

---

## 🚀 Setup Local

### 1️⃣ Levantar PostgreSQL + PostGIS

```bash
docker-compose up -d
```

> Esto levanta un contenedor PostgreSQL 15 con PostGIS habilitado.

### 2️⃣ Instalar dependencias

```bash
pip install -r requirements.txt
```

### 3️⃣ Ejecutar migraciones

```bash
alembic upgrade head
```

### 4️⃣ Iniciar servidor

```bash
uvicorn app.main:app --reload --port 8000
```

> 📖 Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
> 📖 ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 🧪 Testing y Linting

```bash
# Lint con ruff
ruff check app/

# Ejecutar tests
pytest tests/ -v --tb=short

# Coverage
pytest tests/ --cov=app --cov-report=html
```

---

## 🐳 Docker

### Build

```bash
docker build -t tec360-backend .
```

### Run

```bash
docker run -p 8000:8000 --env-file .env tec360-backend
```

> ⚠️ El Dockerfile usa un usuario **non-root** por seguridad.

---

## 🔒 Seguridad

| Medida | Detalle |
|--------|---------|
| 🚦 Rate Limiting | 30 req/min por IP (SlowAPI) |
| 🛡️ Security Headers | CORS, CSP, X-Frame-Options configurados |
| 🚫 Path Traversal | Protección contra ataques de traversal en uploads |
| 🐳 Non-root Docker | El contenedor corre sin privilegios de root |
| 🔑 JWT | Tokens de acceso + refresh con expiración configurable |
| 📡 WebSocket Auth | Autenticación por token en conexiones WebSocket |

---

## 📁 Estructura del Directorio

```
backend/
├── app/
│   ├── api/             # 21 routers (endpoints)
│   ├── core/            # Config, seguridad, dependencias
│   ├── models/          # 14 modelos SQLModel
│   ├── schemas/         # Schemas Pydantic (request/response)
│   ├── services/        # 17 servicios (lógica de negocio)
│   └── main.py          # Punto de entrada FastAPI
├── migrations/
│   └── versions/        # 17 migraciones Alembic
├── tests/               # Tests pytest
├── static/              # Archivos estáticos (uploads)
├── Dockerfile
├── docker-compose.yml   # PostgreSQL + PostGIS local
├── requirements.txt
├── alembic.ini
└── pyproject.toml
```

---

## 🔗 Enlaces

- ⬆️ [README principal](../README.md)
- ⚛️ [Frontend README](../frontend/README.md)
- 📱 [Mobile README](../mobile/README.md)