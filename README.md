# Tec360 Seguridad 🔐

Plataforma de seguridad vehicular para conectar **clientes** con **técnicos certificados SENA** para instalación y mantenimiento de dispositivos de seguridad.

## 🚀 Arquitectura

```
┌─────────────────────────────────────────────────┐
│              Nginx (reverse proxy + SSL)         │
│         tec-360.tech / Let's Encrypt             │
├─────────────┬──────────────┬────────────────────┤
│  Frontend   │  Backend API │    Mobile App      │
│  Next.js 15 │  FastAPI     │    Expo / RN       │
│  React 18   │  SQLModel    │    expo-router     │
│  TypeScript │  PostgreSQL  │    TypeScript      │
│  Port :3000 │  Port :8000  │    EAS Build       │
└─────────────┴──────────────┴────────────────────┘
│                 Docker Compose                    │
│             DigitalOcean Droplet                  │
└──────────────────────────────────────────────────┘
```

## 📋 Funcionalidades

### Roles
| Rol | Descripción |
|-----|-------------|
| **Cliente** | Solicita servicios, revisa cotizaciones, confirma trabajos, califica técnicos |
| **Técnico** | Cotiza servicios, realiza instalaciones, sube evidencias, califica clientes |
| **Admin** | Gestión completa de usuarios, servicios y finanzas |

### Servicios
- 📍 **GPS Vehicular** — Instalación y mantenimiento de rastreadores
- 🚨 **Alarmas** — Sistemas de alertas vehiculares
- 📹 **Dashcam** — Cámaras vehiculares HD
- 🔧 **Mantenimiento** — Servicio técnico para todos los dispositivos

### Features principales
- 📱 **App Móvil (Expo)** — Android/iOS nativa con React Native
- 🌐 **PWA Web** — Panel web instalable como app
- 🗺️ **Google Maps** — Tracking en tiempo real de técnicos vía WebSocket
- ⭐ **Calificaciones bidireccionales** — Cliente ↔ Técnico
- 🏅 **Sistema de Puntos y Niveles** — Bronce → Plata → Oro → Élite (gamificación integral)
- 📸 **Fotos de evidencia** — Inicio, proceso y fin del servicio
- 💬 **Notificaciones** — SMS via Twilio + push notifications
- 📄 **Sistema de cotizaciones** — Presupuestos con contraoferta
- 🔐 **Auth OTP** — Verificación por teléfono (modo dev/SMS real)
- 💰 **Módulo de Pagos** — Registro de pagos en efectivo (Wompi en desarrollo)
- ✅ **Verificación de Técnicos** — Documentos + Quiz de conocimiento + niveles progresivos

### Sistema de Puntos y Niveles
| Nivel | Puntos | Cómo se gana |
|-------|--------|-------------|
| 🥉 Bronce | 0–49 | Técnico nuevo |
| 🥈 Plata | 50–149 | Servicios completados + buenas calificaciones |
| 🥇 Oro | 150–299 | Experiencia sólida + perfil completo |
| 👑 Élite | 300+ | Top performer verificado |

**Acciones que suman/restan puntos:**
- Servicio completado: +10 | Rating 5⭐: +8 | Rating 1⭐: -10
- Perfil completo: +15 | Certificación SENA: +25 | Especialización: +5/cada

## 🛠️ Tech Stack

### Backend
- **FastAPI** — API REST async
- **SQLModel** — ORM (SQLAlchemy + Pydantic)
- **PostgreSQL 15** + **PostGIS** — Base de datos con soporte geoespacial
- **Alembic** — Migraciones de DB
- **JWT** — Autenticación por tokens
- **Twilio** — SMS para OTP
- **WebSocket** — Tracking en vivo
- **Locust** — Pruebas de estrés

### Frontend
- **Next.js 15** (App Router)
- **React 18** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui** — Componentes
- **Framer Motion** — Animaciones
- **Google Maps API** — Mapas y tracking

### Mobile
- **React Native** + **Expo**
- **expo-router** — Navegación file-based
- **expo-linear-gradient** — UI premium
- **react-native-maps** — Mapas nativos
- **EAS Build** — Compilación de APK/IPA

### Infraestructura
- **Docker + Docker Compose** — Containerización
- **Nginx** — Reverse proxy + SSL
- **Let's Encrypt** — Certificados HTTPS automáticos
- **DigitalOcean Droplet** — Servidor de producción
- **GitHub Actions** — CI/CD

## 📂 Estructura del Proyecto

```
tec360-seguridad/
├── backend/
│   ├── app/
│   │   ├── api/           # Endpoints REST + WebSocket
│   │   ├── core/          # Config, database, security, websocket_manager
│   │   ├── models/        # SQLModel tables
│   │   ├── schemas/       # Pydantic request/response schemas
│   │   └── services/      # Business logic layer
│   ├── migrations/        # Alembic migrations
│   ├── tests/             # pytest
│   ├── locustfile.py      # Pruebas de estrés
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/           # Next.js pages (App Router)
│   │   ├── components/    # React components (ui/, quotations/, ratings/, services/)
│   │   └── lib/           # Utils, API client, auth context
│   ├── public/            # Static assets + PWA manifest
│   ├── Dockerfile
│   └── package.json
├── mobile/
│   ├── app/               # Expo Router screens
│   │   ├── (auth)/        # Login, onboarding
│   │   ├── (client)/      # Screens de cliente
│   │   └── (tech)/        # Screens de técnico
│   ├── components/        # Componentes compartidos
│   ├── lib/               # API client, storage utils
│   └── package.json
├── nginx/
│   └── nginx.conf         # Reverse proxy config
├── docker-compose.prod.yml
├── .github/workflows/     # CI/CD
└── .env                   # Environment variables
```

## ⚡ Setup Local

### Requisitos
- Docker + Docker Compose
- Node.js 18+ (frontend + mobile)
- Python 3.11+ (backend)

### Variables de Entorno

```bash
# .env (raíz del proyecto)
DATABASE_URL=postgresql://tec360:password@db:5432/tec360
SECRET_KEY=your_secret_key
SMS_ENABLED=false
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890
GOOGLE_MAPS_API_KEY=your_maps_key
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_maps_key
```

### Desarrollo

```bash
# Backend
cd backend
docker-compose up -d   # PostgreSQL + PostGIS
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev

# Mobile
cd mobile
npm install
npx expo start
```

## 🚢 Deployment

El proyecto se despliega en **DigitalOcean** usando Docker Compose:

```bash
ssh root@<server-ip>
cd /opt/tec360-seguridad
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

### Dominio & SSL
- **Dominio**: `tec-360.tech`
- **SSL**: Let's Encrypt (auto-renewal via Certbot)

## 🧪 Pruebas de Estrés

```bash
cd backend
pip install locust websocket-client
locust -f locustfile.py
# Abrir http://localhost:8089 → Configurar host y usuarios
```

## 📌 Roadmap Actual

### 🔴 En progreso
- [ ] **Verificación de técnicos** — Documentos + Quiz + niveles progresivos
- [ ] **Pruebas de estrés** — Determinar capacidad máxima del servidor
- [ ] **Refinamiento de app** — UX/UI polish general

### 🟡 Próximo
- [ ] Integración de pagos con Wompi
- [ ] Almacenamiento S3/Spaces para uploads
- [ ] Reportes y analytics para admin

### 🟢 Completado
- [x] Sistema de puntos y niveles de técnico (Bronce → Élite)
- [x] Módulo de pagos en efectivo (backend + mobile + admin)
- [x] Sistema de cotizaciones con contraoferta
- [x] Tracking GPS en vivo via WebSocket
- [x] App móvil con Expo (Android APK)
- [x] Calificaciones bidireccionales
- [x] Auth OTP (dev + SMS real)

## 📄 Licencia

Proyecto privado — Tec360 Seguridad © 2025-2026
