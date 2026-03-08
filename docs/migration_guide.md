# Guía de Migración a React Native (Expo)

Esta guía documenta la arquitectura actual del backend y el frontend web de Tec360, con el objetivo de facilitar la creación de las aplicaciones móviles nativas para Cliente y Técnico utilizando Expo.

## 1. Arquitectura de Endpoints (Backend)

El backend actual está construido en FastAPI con base de datos PostgreSQL + PostGIS, y autenticación vía JWT.

### Autenticación (`/api/auth`)
*   `POST /auth/request-otp`: Envía código OTP por email/WhatsApp.
*   `POST /auth/verify-otp`: Verifica OTP y retorna `access_token` (2h) y `refresh_token` (30d). Incluye info del usuario (rol, nombre, etc.).
*   `POST /auth/refresh`: Intercambia un `refresh_token` válido por un nuevo par de tokens.
*   `POST /auth/onboard`: Completa el perfil (nombre, teléfono) de usuarios nuevos post-verificación.

### Usuarios y Perfiles (`/api/users`)
*   `GET /users/me`: Retorna el perfil completo del usuario autenticado.
*   `PATCH /users/me/profile`: Permite actualizar datos básicos (nombre, teléfono).
*   `PATCH /users/me/location`: (Técnicos) Actualiza su ubicación GPS para cálculo de cercanía.
*   `GET /users/technicians/{id}`: Obtiene el perfil público y reviews de un técnico.

### Servicios (`/api/services`)
*   `POST /services`: Crea una solicitud (Cliente). **NUEVO:** Envía también los detalles iniciales del vehículo.
*   `GET /services`: Lista historial/activos del usuario autenticado (con paginación).
*   `GET /services/available`: Marketplace de servicios `pending` (solo Técnicos).
*   `POST /services/{id}/accept`: Un técnico acepta un servicio `pending`.
*   `PATCH /services/{id}/status`: Flujo del técnico (`en_route` -> `arrived` -> `in_progress` -> `completed`).
*   `GET /services/{id}`: Detalle de servicio. **ACTUALIZADO**: Retorna `technician` (avatar, teléfono) y `vehicle_photo_url`.

### Archivos (`/api/uploads`)
*   `POST /uploads/avatar`: Sube/actualiza foto de perfil del usuario.
*   `POST /uploads/vehicle-photo`: (Cliente) Sube foto de referencia de su vehículo al crear el servicio.
*   `POST /uploads/service-photo`: (Técnico) Sube evidencias (`before`, `during`, `after`) asociadas a un `service_id`.

## 2. Mapa de Pantallas (Frontend a Expo)

La aplicación nativa en Expo puede estructurarse con `expo-router` usando pestañas (Tabs) basadas en el rol.

### Flujo de Autenticación (Común)
*   **Web:** `/login`, `/verificar`, `/onboarding`
*   **Expo:** `(auth)/login.tsx` (Input teléfono), `(auth)/verify.tsx` (OTP), `(auth)/onboarding.tsx`

### Pantallas del Cliente (Role: `client`)
*   **Crear Solicitud (Web: `/servicios/nuevo`):** 
    *   Formulario por pasos (Tipo, Vehículo, Foto de placa/referencia, Ubicación). 
    *   **Expo:** Usar `expo-image-picker` con compresión `quality: 0.8` para cargar la foto del vehículo.
*   **Esperando Técnico (Web: `/servicios/[id]/esperando`):**
    *   Muestra el progress ring, detalles del servicio, e información del técnico asignado (avatar, reviews).
    *   Se conecta vía WebSocket para cambios de estado.
*   **Tracking Activo (Web: `/servicios/[id]/mapa`):**
    *   Muestra mapa (usar `react-native-maps`).
    *   Si el estado es `en_route` o `in_progress`, consultar geolocalización websocket del técnico.
*   **Historial (Web: `/historial`):** Lista paginada del Endpoint `GET /services`.

### Pantallas del Técnico (Role: `technician`)
*   **Dashboard / Marketplace (Web: `/tecnicos/dashboard`):** 
    *   Botón "Obtener Trabajos".
    *   Lista de servicios obtenidos mediante `GET /services/available`.
    *   Botón de toggle "En línea" para enviar ubicación (`runLocationBackgroundTask` en expo).
*   **Detalle del Servicio Activo (Web: `/tecnicos/servicio/[id]`):**
    *   Muestra info del cliente (celular para llamar).
    *   **NUEVO**: Muestra la foto de referencia del vehículo del cliente si fue aportada.
    *   Botones de flujo: "En Camino", "Llegué", "Iniciar Trabajo", "Finalizar".
    *   **Obligatorio:** Cada transición de estado principal requiere usar la cámara nativa (`expo-image-picker`) para la foto de evidencia.

## 3. Web-only Features (No migrar)

Ciertas funcionalidades administrativas se mantendrán exclusivamente en la plataforma Web y **NO ES NECESARIO** migrarlas a la App Móvil:
*   `/admin/*` (Dashboard, Gestión de usuarios, Cambios de roles manuales).
*   `/configuracion` (Ajustes de infraestructura).

## 4. Notas Técnicas (React Native)

*   **Red / CORS:** Las aplicaciones Expo funcionan desde el esquema `exp://` (desarrollo) y esquemas personalizados tipo `tec360://` (prod). Ya configuramos el backend de FastAPI con `EXTRA_CORS_ORIGINS` y el wildcard `*` para métodos API.
*   **Push Notifications:** El sistema actual web usa WebSockets. Para móvil, se recomienda añadir **Expo Push Notifications** al backend para alertar al cliente cuando el servicio fue asignado aunque la app esté en background.
*   **Imágenes (Avatars y Fotos):** Las imágenes retornadas del backend (por ej. avatar_url: `/uploads/avatars/1.jpg`) son rutas relativas. La app móvil necesitará el prefijo HTTP concatenado (ej. `process.env.EXPO_PUBLIC_STATIC_URL + user.avatar_url`) de la misma forma que está hecho en la Web.
*   **Compresión de Imágenes:** En web usamos Canvas. En Expo, al usar `launchCameraAsync` o `launchImageLibraryAsync`, se le pasa `{ quality: 0.8 }`, lo cual realiza la compresión de forma nativa sin lógica adicional.
*   **WebSockets (`/ws/{client_id}`):** Asegurarse de re-conectar silenciosamente si el WebSocket se corta por cambiar a 4G. Usar librerías como `react-native-websocket` o simplemente el estándar `WebSocket` con keep-alive en el cliente.
