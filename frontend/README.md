# ⚛️ Tec360 Seguridad — Frontend Web

Aplicación web construida con Next.js 15 (App Router) para clientes, técnicos y administradores de la plataforma Tec360.

> 🌐 Producción: [https://tec-360.tech](https://tec-360.tech)

---

## 🛠️ Stack

| Tecnología | Versión | Uso |
|-----------|---------|-----|
| Next.js | 15 | Framework React con App Router |
| React | 19 | Librería UI |
| TypeScript | — | Tipado estático |
| Tailwind CSS | v4 | Estilos utilitarios (sin archivo config) |
| Framer Motion | — | Animaciones y transiciones |
| Google Maps | — | Mapas, rastreo de técnicos |
| shadcn/ui | — | Componentes UI accesibles |

---

## 👥 Módulos por Rol

| Rol | Funcionalidades |
|-----|----------------|
| 👤 **Cliente** | Solicitar servicios, ver cotizaciones, rastrear técnico en vivo, calificar, chat, historial, notificaciones |
| 🔧 **Técnico** | Dashboard, trabajos disponibles, cotizar, ejecutar servicios, GPS streaming, billetera de créditos, perfil |
| 🛡️ **Admin** | Panel de control, gestión de usuarios, finanzas, verificaciones de técnicos, estadísticas |

---

## 📄 Inventario de Páginas

### 🔐 Autenticación (`/auth`, `/login`, `/register`)

| Ruta | Descripción |
|------|-------------|
| `/auth/phone` | Ingreso de número telefónico |
| `/auth/verify` | Verificación de código OTP |
| `/login` | Página de login |
| `/register` | Registro de nuevo usuario |

### 👤 Cliente — Servicios (`/servicios`)

| Ruta | Descripción |
|------|-------------|
| `/servicios` | Lista de servicios activos |
| `/servicios/nuevo` | Solicitar nuevo servicio |
| `/servicios/historial` | Historial de servicios completados |
| `/servicios/[id]` | Detalle de servicio (con mapa, chat, evidencia) |

### 🔧 Técnico (`/tecnicos`)

| Ruta | Descripción |
|------|-------------|
| `/tecnicos/dashboard` | Dashboard del técnico |
| `/tecnicos/trabajos` | Trabajos disponibles y asignados |
| `/tecnicos/cotizar` | Crear/enviar cotizaciones |
| `/tecnicos/mis-cotizaciones` | Cotizaciones enviadas |
| `/tecnicos/servicio` | Detalle del servicio en ejecución |
| `/tecnicos/billetera` | Wallet de créditos |
| `/tecnicos/perfil` | Perfil del técnico |

### 🛡️ Administración (`/admin`)

| Ruta | Descripción |
|------|-------------|
| `/admin` | Dashboard principal con analíticas |
| `/admin/usuarios` | Gestión de usuarios (clientes y técnicos) |
| `/admin/servicios` | Gestión de todos los servicios |
| `/admin/finanzas` | Panel financiero |
| `/admin/verificaciones` | Verificación de documentos de técnicos |

### 🌐 Otras

| Ruta | Descripción |
|------|-------------|
| `/` | Landing page (hero + features) |
| `/configuracion` | Configuración de cuenta |
| `/descargar-app` | Página de descarga de la app móvil |
| `/offline` | Página offline (PWA) |

---

## 🧩 Componentes

Organizados en `src/components/`:

### 🎨 UI Base (`ui/`)
Componentes de shadcn/ui — botones, inputs, modals, etc.

### 🏠 Layout
| Componente | Descripción |
|-----------|-------------|
| `navbar.tsx` | Barra de navegación principal con menú por rol |
| `hero.tsx` | Hero section de la landing page |
| `features.tsx` | Sección de funcionalidades |
| `theme-provider.tsx` | Provider de tema (dark/light) |

### 🔧 Funcionalidades

| Componente | Descripción |
|-----------|-------------|
| `service-card.tsx` | Tarjeta de servicio reutilizable |
| `quotation-card.tsx` | Tarjeta de cotización |
| `quotation-list.tsx` | Lista de cotizaciones |
| `review-list.tsx` | Lista de reseñas/calificaciones |
| `PaymentModal.tsx` | Modal de confirmación de pago |

### 📂 Subdirectorios de Componentes

| Directorio | Contenido |
|-----------|-----------|
| `services/` | Componentes de detalle de servicio, mapa, evidencia |
| `quotations/` | Componentes de cotización y contra-oferta |
| `ratings/` | Estrellas, formulario de calificación |
| `chat/` | Burbuja de mensaje, input de chat |
| `notifications/` | Panel y badge de notificaciones |
| `pwa/` | Banner de instalación PWA, service worker |
| `auth/` | Formularios de autenticación |
| `technician/` | Componentes del perfil del técnico |

---

## 📚 Librerías (`src/lib/`)

| Archivo | Descripción |
|---------|-------------|
| `api.ts` | Cliente HTTP con `fetchWithAuth`, manejo de tokens, interceptors |
| `auth-context.tsx` | Context de autenticación (usuario, rol, login/logout) |
| `websocket.ts` | Manager WebSocket para chat y GPS en tiempo real |
| `notifications.ts` | Push notifications web (VAPID), permisos, suscripción |
| `validations.ts` | Validaciones de formularios (teléfono, cédula, etc.) |
| `quotations.ts` | Helpers de cotizaciones (estados, formateo) |
| `use-location-tracking.ts` | Hook para tracking GPS del técnico |
| `utils.ts` | Utilidades generales |

---

## 🚀 Setup Local

### Instalar y ejecutar

```bash
npm install
npm run dev
```

> 🌐 Disponible en [http://localhost:3000](http://localhost:3000)

### Build de producción

```bash
npm run build
npm start
```

### Docker

```bash
docker build -t tec360-frontend .
docker run -p 3000:3000 tec360-frontend
```

---

## 🔑 Variables de Entorno

Crear archivo `.env.local` basado en `.env.local.example`:

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | URL base de la API backend (ej: `https://tec-360.tech/api`) |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | API key de Google Maps para mapas |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Clave pública VAPID para push notifications |

---

## 📐 Convenciones

| Convención | Detalle |
|-----------|---------|
| `pt-24` | Offset del navbar en todas las páginas con contenido |
| `fetchWithAuth` | Siempre usar para llamadas autenticadas (maneja refresh automáticamente) |
| Tailwind v4 | Sin archivo `tailwind.config.js` — la configuración va en `globals.css` |
| App Router | Usar `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx` por convención Next.js |
| Componentes | PascalCase para archivos de componentes de UI, kebab-case para features |

---

## 📁 Estructura del Directorio

```
frontend/
├── src/
│   ├── app/                  # Páginas (App Router)
│   │   ├── admin/            # Panel de administración
│   │   ├── auth/             # Autenticación (phone, verify)
│   │   ├── configuracion/    # Configuración de cuenta
│   │   ├── descargar-app/    # Descarga de app móvil
│   │   ├── login/            # Login
│   │   ├── offline/          # Página offline PWA
│   │   ├── register/         # Registro
│   │   ├── servicios/        # Módulo cliente
│   │   ├── tecnicos/         # Módulo técnico
│   │   ├── layout.tsx        # Layout raíz
│   │   ├── globals.css       # Estilos globales + Tailwind v4
│   │   └── page.tsx          # Landing page
│   ├── components/           # Componentes reutilizables
│   ├── hooks/                # Custom hooks
│   └── lib/                  # Utilidades y contextos
├── public/                   # Assets estáticos (icons, manifest PWA)
├── Dockerfile
├── package.json
├── next.config.ts
├── tsconfig.json
└── postcss.config.mjs
```

---

## 🔗 Enlaces

- ⬆️ [README principal](../README.md)
- 🐍 [Backend README](../backend/README.md)
- 📱 [Mobile README](../mobile/README.md)
