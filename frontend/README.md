# 🖥️ Tec360 Seguridad — Frontend

Aplicación web construida con **Next.js 15** + **React 19** + **TypeScript**.

---

## ⚠️ Funcionalidad Pendiente

> **Sistema de Pagos (C2) NO implementado.** No existe vista de pago ni integración con pasarela.
> El flujo finaliza en la aprobación de cotización y asignación del técnico.

---

## 📦 Tech Stack

- **Next.js 15** (App Router)
- **React 19** + TypeScript
- **Framer Motion** — Animaciones
- **Lucide React** — Iconos
- **Google Maps API** — Mapas interactivos
- **date-fns** — Formato de fechas (español)
- **shadcn/ui** — Componentes UI base

---

## 🚀 Instalación

### 1. Instalar dependencias
```bash
npm install
```

### 2. Variables de entorno
Crear `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=tu-google-maps-api-key
```

### 3. Ejecutar
```bash
npm run dev
```
- App: http://localhost:3000

### Con Docker (alternativa)
```bash
docker run -it --rm -p 3000:3000 -v ${PWD}:/app -w /app node:24-alpine sh
npm install && npm run dev
```

---

## 🗂️ Estructura de Páginas

```
src/app/
├── page.tsx                          # Landing / Redirección
├── login/                            # Inicio de sesión
├── register/                         # Registro de cuenta
├── auth/                             # Flujo de autenticación
│
├── servicios/                        # === CLIENTE ===
│   ├── page.tsx                      # Lista de mis servicios
│   ├── nuevo/                        # Crear servicio (con mapa)
│   └── [id]/                         # Detalle del servicio
│       └── cotizaciones/             # Ver y gestionar cotizaciones
│
├── tecnicos/                         # === TÉCNICO ===
│   ├── page.tsx                      # Dashboard (disponibles + mis trabajos)
│   ├── cotizar/[id]/                 # Enviar cotización a servicio
│   ├── mis-cotizaciones/             # Ver cotizaciones + contraofertas
│   └── servicio/[id]/                # Tracking y gestión de servicio
│
├── mapa/                             # Mapa interactivo
├── resenas/                          # Sistema de reseñas
└── imagenes/                         # Gestión de imágenes
```

---

## 🧩 Componentes Principales

| Componente | Ubicación | Función |
|-----------|-----------|---------|
| `GlassCard` | `ui/glass-card` | Card con efecto glassmorphism |
| `LiveTrackingView` | `services/live-tracking-view` | Tracking GPS en tiempo real |
| `ServiceMap` | `services/service-map` | Mapa de ubicación del servicio |
| `TechnicianDashboard` | `technician/technician-dashboard` | Panel del técnico |
| `RatingModal` | `ratings/rating-modal` | Modal de calificación |
| `QuotationCard` | `quotations/quotation-card` | Card de cotización |
| `NotificationBell` | — | Campana con contador |
| `OnboardingForm` | — | Formulario de onboarding |

---

## 🔐 Autenticación

La autenticación usa JWT almacenado en `localStorage`:

```typescript
// lib/auth-context.tsx provee:
const { user, token, login, logout, isAuthenticated } = useAuth()

// Rutas protegidas:
<ProtectedRoute allowedRoles={["client"]}>
  <ClientPage />
</ProtectedRoute>
```

### Roles
- **client** — Crea servicios, gestiona cotizaciones, califica técnicos
- **technician** — Ve servicios disponibles, envía cotizaciones, tracking
- **admin** — Panel de administración

---

## 🔄 Flujo de Usuario

### Cliente
1. Registro → Onboarding (seleccionar rol)
2. Dashboard → Ver servicios
3. Crear servicio → Seleccionar ubicación en mapa
4. Ver cotizaciones → Aprobar / Rechazar / Contraoferta
5. Tracking en vivo del técnico
6. Calificar servicio completado

### Técnico
1. Registro → Onboarding (seleccionar rol)
2. Dashboard → Ver servicios disponibles
3. Cotizar servicio
4. Ver contraofertas → Aceptar / Rechazar
5. Iniciar servicio → Tracking GPS
6. Completar servicio

---

## 📋 API Client

```typescript
// lib/api.ts — Funciones principales:
getAvailableServices()
getUserServices()
getServiceById(id)
createService(data)
acceptService(id)
updateServiceStatus(id, status)

// lib/quotations.ts — Cotizaciones:
createQuotation(serviceId, data)
getMyQuotations(status?, page?)
getServiceQuotations(serviceId)
approveQuotation(id)
rejectQuotation(id)
counterOfferQuotation(id, data)
```

---

**Versión**: 0.5.0 | **Última actualización**: Febrero 2026
