# Tec360 Seguridad 🔐

Plataforma de seguridad vehicular para conectar **clientes** con **técnicos certificados SENA** para instalación y mantenimiento de dispositivos de seguridad.

## 🚀 Arquitectura

```
┌─────────────────────────────────────────────────┐
│              Nginx (reverse proxy + SSL)         │
│         tec-360.tech / Let's Encrypt             │
├─────────────────┬───────────────────────────────┤
│   Frontend      │      Backend API              │
│   Next.js 14    │      FastAPI + SQLModel        │
│   React 18      │      PostgreSQL + PostGIS      │
│   TypeScript    │      Python 3.11               │
│   Framer Motion │      JWT Auth + OTP (Twilio)   │
│   Port :3000    │      Port :8000                │
└─────────────────┴───────────────────────────────┘
│                    Docker Compose                 │
│                DigitalOcean Droplet               │
└─────────────────────────────────────────────────┘
```

## 📋 Funcionalidades

### Roles
| Rol | Descripción |
|-----|-------------|
| **Cliente** | Solicita servicios, confirma trabajos, califica técnicos |
| **Técnico** | Acepta trabajos, envía cotizaciones, sube evidencias, califica clientes |
| **Admin** | Gestión completa de usuarios y servicios |

### Servicios
- 📍 **GPS Vehicular** — Instalación y mantenimiento de rastreadores
- 🚨 **Alarmas** — Sistemas de alertas vehiculares
- 📹 **Dashcam** — Cámaras vehiculares HD
- 🔧 **Mantenimiento** — Servicio técnico para todos los dispositivos

### Features principales
- 📱 **PWA** — Instalable como app nativa
- 🗺️ **Google Maps** — Tracking en tiempo real de técnicos
- ⭐ **Calificaciones bidireccionales** — Cliente ↔ Técnico
- 🏅 **Rangos de técnicos** — Bronze → Silver → Gold (sistema de puntos)
- 📸 **Fotos de evidencia** — Inicio, proceso y fin del servicio
- 💬 **Notificaciones** — SMS via Twilio + push notifications
- 📄 **Sistema de cotizaciones** — Técnicos envían presupuestos, clientes aceptan/rechazan
- 🔐 **Auth OTP** — Verificación por teléfono (mode dev/SMS real)

### Sistema de Rangos
| Rango | Puntos | Cómo se gana |
|-------|--------|-------------|
| 🥉 Bronze | 0–49 | Técnico nuevo |
| 🥈 Silver | 50–149 | Experiencia + buenas calificaciones |
| 🥇 Gold | 150+ | Experto verificado |

**Fórmula:** Servicios×5 + Meses_experiencia×2 + Certificados×15 + Rating×10 + SENA_verificado×20

## 🛠️ Tech Stack

### Backend
- **FastAPI** — API REST async
- **SQLModel** — ORM (SQLAlchemy + Pydantic)
- **PostgreSQL 15** + **PostGIS** — Base de datos con soporte geoespacial
- **Alembic** — Migraciones de DB
- **JWT** — Autenticación por tokens
- **Twilio** — SMS para OTP
- **python-multipart** — Upload de archivos

### Frontend
- **Next.js 14** (App Router)
- **React 18** + **TypeScript**
- **Framer Motion** — Animaciones
- **shadcn/ui** — Componentes base
- **Google Maps API** — Mapas y tracking
- **Leaflet** — Selector de ubicación

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
│   │   ├── api/           # Endpoints REST
│   │   ├── core/          # Config, database, security
│   │   ├── models/        # SQLModel (User, Service, Technician, etc.)
│   │   ├── schemas/       # Pydantic validation schemas
│   │   └── services/      # Business logic layer
│   ├── migrations/        # Alembic migrations
│   ├── tests/             # pytest
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/           # Next.js pages (App Router)
│   │   ├── components/    # React components
│   │   └── lib/           # Utils, API client, auth context
│   ├── public/            # Static assets + PWA manifest
│   ├── Dockerfile
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
- Node.js 18+ (para desarrollo frontend)
- Python 3.11+ (para desarrollo backend)

### Variables de Entorno

```bash
# .env
DATABASE_URL=postgresql://tec360:password@db:5432/tec360
JWT_SECRET_KEY=your_secret_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890
GOOGLE_MAPS_API_KEY=your_maps_key
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_key
```

### Desarrollo

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev

# Docker (producción local)
docker compose -f docker-compose.prod.yml up --build
```

## 🚢 Deployment

El proyecto se despliega en **DigitalOcean** usando Docker Compose:

```bash
ssh root@<server-ip>
cd /opt/tec360-seguridad
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Ver [deployment_guide.md] para instrucciones completas.

### Dominio & SSL
- **Dominio**: `tec-360.tech`
- **SSL**: Let's Encrypt (auto-renewal via Certbot)

## ⚠️ Notas Futuras

### Almacenamiento de Archivos (S3)
Actualmente las fotos de perfil y evidencias de servicio se almacenan localmente en el servidor (`/opt/tec360-seguridad/uploads/`), servidas por Nginx.

**Para producción a escala** se debe evaluar:
- **DigitalOcean Spaces** (compatible con S3, regional)
- **AWS S3** + CloudFront (CDN global)
- **Cloudflare R2** (sin egress fees)

> 📌 **TODO**: Migrar a almacenamiento de objetos externo antes de escalar a múltiples servidores o cuando el volumen de uploads supere 10GB.

### Mejoras Planificadas
- [ ] Almacenamiento S3/Spaces para uploads
- [ ] Notificaciones push nativas
- [ ] Panel admin completo
- [ ] Reportes y analytics
- [ ] Pasarela de pagos

## 📄 Licencia

Proyecto privado — Tec360 Seguridad © 2025
