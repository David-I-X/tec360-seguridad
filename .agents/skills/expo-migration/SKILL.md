---
name: Expo Migration
description: Guidelines and conventions for migrating the web app to React Native using Expo.
---

# Expo / React Native Migration

## Overview

The Tec360 web app is being migrated to a native mobile app using **Expo** (React Native). The backend stays the same — only the frontend changes.

## Screen Mapping (Web → Native)

| Web Route                      | Expo Screen           | Notes                        |
|--------------------------------|-----------------------|------------------------------|
| `/login`                       | `LoginScreen`         | OTP phone auth               |
| `/auth/phone`                  | `PhoneAuthScreen`     | Phone number input           |
| `/auth/verify`                 | `VerifyOTPScreen`     | OTP code entry               |
| `/register`                    | `OnboardingScreen`    | Name, email, role selection  |
| `/servicios`                   | `ServicesListScreen`  | Client service list          |
| `/servicios/nuevo`             | `NewServiceScreen`    | Create service request       |
| `/servicios/[id]`              | `ServiceDetailScreen` | Detail + LiveTracking        |
| `/servicios/[id]/esperando`    | `WaitingScreen`       | Wait for technician (WS)    |
| `/servicios/[id]/cotizaciones` | `QuotationsScreen`    | View/accept quotes           |
| `/tecnicos/dashboard`          | `TechDashboard`       | Technician home              |
| `/tecnicos/servicio/[id]`      | `TechServiceScreen`   | Active service management    |
| `/tecnicos/perfil/[id]`        | `TechProfileScreen`   | Public technician profile    |
| `/configuracion`               | `SettingsScreen`      | User settings                |
| `/admin`                       | *(web only)*          | Admin panel stays web-only   |

## Key Libraries for Expo

| Web Library         | Expo Equivalent                     |
|---------------------|-------------------------------------|
| Next.js Router      | `expo-router` (file-based routing)  |
| Google Maps (JS)    | `react-native-maps`                |
| `<img>` tag         | `<Image>` from React Native        |
| `<input type=file>` | `expo-image-picker`                 |
| `localStorage`      | `expo-secure-store`                 |
| CSS / Tailwind      | `StyleSheet` or `nativewind`        |
| `framer-motion`     | `react-native-reanimated`           |
| `fetch`             | `fetch` (same API)                  |
| WebSocket           | `WebSocket` (same API)              |
| `canvas` (compress) | `expo-image-manipulator`            |

## Auth Flow in Expo

```typescript
// Store tokens securely
import * as SecureStore from 'expo-secure-store'

await SecureStore.setItemAsync('access_token', token)
await SecureStore.setItemAsync('refresh_token', refreshToken)

const token = await SecureStore.getItemAsync('access_token')
```

## API Configuration

```typescript
// Use environment variable or constant
const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://tec-360.tech/api"
```

CORS is already configured on the backend to accept requests from native apps (via `EXTRA_CORS_ORIGINS`).

## Image Handling

Replace canvas-based compression with `expo-image-manipulator`:

```typescript
import * as ImageManipulator from 'expo-image-manipulator'

const compressed = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 800 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
)
```

## WebSockets

The WebSocket API is identical in React Native. The existing `websocket.ts` logic can be reused directly.

## GPS / Location

```typescript
import * as Location from 'expo-location'

const { status } = await Location.requestForegroundPermissionsAsync()
const location = await Location.getCurrentPositionAsync({})
// location.coords.latitude, location.coords.longitude
```

## Push Notifications

```typescript
import * as Notifications from 'expo-notifications'

const { status } = await Notifications.requestPermissionsAsync()
const token = await Notifications.getExpoPushTokenAsync()
// Send token to backend for push notifications
```

## Web-Only Features (Do NOT migrate)

- Landing page (Hero, Features sections)
- Admin panel
- SEO metadata
- Service Worker (PWA)

## Project Initialization

```bash
npx create-expo-app@latest ./tec360-app --template tabs
cd tec360-app
npx expo install expo-router expo-secure-store expo-image-picker expo-location react-native-maps expo-image-manipulator react-native-reanimated
```
