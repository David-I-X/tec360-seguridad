# 📱 Tec360 Seguridad — Mobile App

App móvil construida con **React Native** + **Expo** + **expo-router**.

---

## 📦 Tech Stack

- **React Native** — Framework móvil cross-platform
- **Expo SDK** — Herramientas y APIs nativas
- **expo-router** — File-based routing
- **TypeScript** — Tipado estático
- **expo-linear-gradient** — Gradientes para UI premium
- **react-native-maps** — Mapas nativos (Google Maps)
- **expo-secure-store** — Almacenamiento seguro de tokens
- **expo-image-picker** — Captura de fotos de evidencia
- **EAS Build** — Compilación de APK/IPA en la nube

---

## 🚀 Setup

### 1. Instalar dependencias
```bash
npm install
```

### 2. Variables de entorno
Crear `.env` en la raíz de `mobile/`:
```env
EXPO_PUBLIC_API_URL=http://localhost:8000
```

### 3. Ejecutar
```bash
npx expo start
```
Escanea el QR con **Expo Go** (Android/iOS) o usa un emulador.

### 4. Build APK
```bash
npx eas build --platform android --profile preview
```

---

## 🗂️ Estructura

```
mobile/
├── app/                    # Screens (expo-router file-based)
│   ├── _layout.tsx         # Root layout + auth provider
│   ├── index.tsx           # Splash / redirect
│   ├── (auth)/             # Login & onboarding screens
│   │   ├── login.tsx       # OTP phone verification
│   │   └── onboarding.tsx  # Nombre, email, rol
│   ├── (client)/           # Screens de cliente
│   │   ├── dashboard.tsx   # Vista principal cliente
│   │   ├── create-service.tsx
│   │   ├── service/[id].tsx
│   │   ├── quotations/[id].tsx  # Lista cotizaciones con TechLevel
│   │   └── waiting/[id].tsx
│   └── (tech)/             # Screens de técnico
│       ├── dashboard.tsx   # Vista principal técnico + earnings
│       ├── service/[id].tsx
│       └── browse.tsx      # Buscar servicios pendientes
├── components/             # Componentes compartidos
│   ├── rating-modal.tsx    # Modal de calificación
│   └── tech-level.tsx      # Badge de nivel del técnico (🥉🥈🥇👑)
├── lib/
│   ├── api.ts              # fetchWithAuth, endpoints
│   └── auth.ts             # AuthContext, secure-store
├── constants/
│   └── Colors.ts
├── assets/                 # Imágenes, iconos, splash
├── app.config.js           # Expo config
├── eas.json                # EAS Build profiles
└── package.json
```

---

## 🎨 Convenciones

- **Styling**: `StyleSheet.create()` estándar de React Native (NO Nativewind/Tailwind)
- **Navegación**: `expo-router` con file-based routing
- **Imágenes**: Usar `<Image>` de React Native
- **Almacenamiento**: `expo-secure-store` para tokens, `AsyncStorage` para preferencias
- **Mapas**: `react-native-maps` con provider Google
- **Auth**: Todas las llamadas API usan `fetchWithAuth()` de `lib/api.ts`
- **Colores**: Dark theme con fondo `#050810`, acentos violeta `#8b5cf6`

---

## 📌 Features Actuales

- ✅ Login con OTP (teléfono)
- ✅ Onboarding (selección de rol)
- ✅ Dashboard cliente con lista de servicios
- ✅ Crear solicitud de servicio con ubicación GPS
- ✅ Ver y aceptar cotizaciones con **nivel del técnico visible**
- ✅ Tracking en vivo del técnico (WebSocket + Maps)
- ✅ Calificar servicio (modal con estrellas)
- ✅ Dashboard técnico con resumen de ganancias
- ✅ Registrar pago en efectivo
- ✅ Componente `TechLevel` (badge + estrellas + puntos)

---

**Versión**: 0.8.0 | **Última actualización**: Mayo 2026
