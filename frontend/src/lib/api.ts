/**
 * API Client
 * Cliente para comunicarse con el backend FastAPI
 */

// URL base del backend (viene de variables de entorno)
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// ============================================
// TIPOS
// ============================================

export interface APIError {
  success: false
  error: string
  details?: string[]
  code?: string
}

export interface OTPResponse {
  success: true
  message: string
  phone: string
  expires_in_minutes: number
  code?: string // Solo en desarrollo
}

export interface AuthResponse {
  success: true
  message: string
  access_token: string
  refresh_token: string
  user: {
    id: string
    phone: string
    email?: string
    user_metadata: Record<string, any>
    created_at?: string
  }
  is_new_user: boolean
}

export interface OnboardingResponse {
  success: true
  message: string
  user: {
    id: string
    phone: string
    full_name: string
    email?: string
    role: string
    onboarding_completed: boolean
  }
}

export interface UserResponse {
  success: true
  user: {
    id: string
    phone: string
    email?: string
    full_name?: string
    role?: string
    onboarding_completed?: boolean
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Maneja errores de la API y los convierte a formato estándar
 */
async function handleAPIError(response: Response): Promise<never> {
  let errorData: any

  try {
    errorData = await response.json()
  } catch {
    throw new Error(`Error ${response.status}: ${response.statusText}`)
  }

  // Si el error viene en formato estándar
  if (errorData.error) {
    throw new Error(errorData.error)
  }

  // Si viene en formato FastAPI validation error
  if (errorData.detail) {
    if (typeof errorData.detail === "string") {
      throw new Error(errorData.detail)
    }
    if (Array.isArray(errorData.detail)) {
      const errors = errorData.detail.map((e: any) => e.msg).join(", ")
      throw new Error(errors)
    }
  }

  throw new Error("Error desconocido del servidor")
}

/**
 * Obtiene el token de autenticación del localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("access_token")
}

/**
 * Guarda tokens en localStorage
 */
export function saveTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem("access_token", accessToken)
  localStorage.setItem("refresh_token", refreshToken)
}

/**
 * Elimina tokens del localStorage
 */
export function clearTokens(): void {
  localStorage.removeItem("access_token")
  localStorage.removeItem("refresh_token")
  localStorage.removeItem("user")
}

/**
 * Guarda información del usuario en localStorage
 */
export function saveUser(user: any): void {
  localStorage.setItem("user", JSON.stringify(user))
}

/**
 * Obtiene información del usuario del localStorage
 */
export function getUser(): any | null {
  if (typeof window === "undefined") return null
  const userData = localStorage.getItem("user")
  return userData ? JSON.parse(userData) : null
}

// ============================================
// HELPER - Request with Auto-Refresh
// ============================================

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  if (!token) throw new Error("No estás autenticado");

  const headers = new Headers(options.headers || {});
  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const endpointUrl = url.startsWith("http") ? url : `${API_URL}${url}`;
  let response = await fetch(endpointUrl, { ...options, headers });

  if (response.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const { access_token } = await refreshToken();
        isRefreshing = false;
        onRefreshed(access_token);
      } catch (err) {
        isRefreshing = false;
        logout();
        throw err;
      }
    }

    const retryOriginalRequest = new Promise<Response>((resolve) => {
      addRefreshSubscriber(async (newToken) => {
        headers.set("Authorization", `Bearer ${newToken}`);
        const retryResponse = await fetch(endpointUrl, { ...options, headers });
        resolve(retryResponse);
      });
    });
    return retryOriginalRequest;
  }

  return response;
}

// ============================================
// AUTH ENDPOINTS
// ============================================

/**
 * Solicita un código OTP por SMS
 */
export async function requestOTP(phone: string): Promise<OTPResponse> {
  const response = await fetch(`${API_URL}/auth/request-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phone }),
  })

  if (!response.ok) {
    await handleAPIError(response)
  }

  return response.json()
}

/**
 * Verifica el código OTP y autentica al usuario
 */
export async function verifyOTP(
  phone: string,
  code: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/verify-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phone, code }),
  })

  if (!response.ok) {
    await handleAPIError(response)
  }

  const data: AuthResponse = await response.json()

  // Guardar tokens y usuario en localStorage
  saveTokens(data.access_token, data.refresh_token)
  saveUser(data.user)

  return data
}

/**
 * Completa el perfil del usuario (onboarding)
 */
export async function completeOnboarding(data: {
  full_name: string
  email?: string
  user_type: "client" | "technician"
}): Promise<OnboardingResponse> {
  const response = await fetchWithAuth("/auth/onboarding", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    await handleAPIError(response)
  }

  const responseData: OnboardingResponse = await response.json()

  // Actualizar usuario en localStorage
  saveUser(responseData.user)

  return responseData
}

/**
 * Obtiene información del usuario actual
 */
export async function getCurrentUser(): Promise<UserResponse> {
  const response = await fetchWithAuth("/auth/me", {
    method: "GET",
  })

  if (!response.ok) {
    await handleAPIError(response)
  }

  return response.json()
}

/**
 * Renueva el access token usando el refresh token
 */
export async function refreshToken(): Promise<{
  access_token: string
  refresh_token: string
}> {
  const refreshTokenValue = localStorage.getItem("refresh_token")

  if (!refreshTokenValue) {
    throw new Error("No hay refresh token")
  }

  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: refreshTokenValue }),
  })

  if (!response.ok) {
    // Si falla el refresh, limpiar tokens
    clearTokens()
    await handleAPIError(response)
  }

  const data = await response.json()
  saveTokens(data.access_token, data.refresh_token)

  return data
}

/**
 * Cierra sesión del usuario
 */
export function logout(): void {
  clearTokens()
  // Redirigir al home
  if (typeof window !== "undefined") {
    window.location.href = "/"
  }
}

// ============================================
// SERVICE ENDPOINTS
// ============================================

/**
 * Crea una nueva solicitud de servicio
 */
export async function createServiceRequest(data: {
  service_type: string
  title: string
  description: string
  service_address: string
  service_city: string
  service_lat: number
  service_lon: number
  scheduled_date?: string
  client_notes?: string
  estimated_price?: number
  vehicle_type?: string
  vehicle_model?: string
  vehicle_plate?: string
  service_metadata?: Record<string, any>
}): Promise<any> {
  const response = await fetchWithAuth("/services", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    await handleAPIError(response)
  }

  return response.json()
}

/**
 * Obtiene los servicios disponibles (Marketplace)
 * Solo para técnicos
 */
export async function getAvailableServices(): Promise<any> {
  const response = await fetchWithAuth("/services/available", {
    method: "GET",
  })

  if (!response.ok) await handleAPIError(response)
  return response.json()
}

/**
 * Acepta un servicio (Self-Assignment)
 * Solo para técnicos
 */
export async function acceptService(serviceId: string): Promise<any> {
  const response = await fetchWithAuth(`/services/${serviceId}/accept`, {
    method: "POST",
  })

  if (!response.ok) await handleAPIError(response)
  return response.json()
}

/**
 * Obtiene los servicios del usuario actual
 */
export async function getUserServices(): Promise<any> {
  const response = await fetchWithAuth("/services", {
    method: "GET",
  })

  if (!response.ok) {
    await handleAPIError(response)
  }

  return response.json()
}

/**
 * Obtiene un servicio por ID
 */
export async function getServiceById(serviceId: string): Promise<any> {
  const response = await fetchWithAuth(`/services/${serviceId}`, {
    method: "GET",
  })

  if (!response.ok) {
    await handleAPIError(response)
  }

  return response.json()
}

/**
 * Cancela un servicio (cliente o admin)
 */
export async function cancelService(serviceId: string): Promise<void> {
  const response = await fetchWithAuth(`/services/${serviceId}`, {
    method: "DELETE",
  })
  if (!response.ok && response.status !== 204) {
    await handleAPIError(response)
  }
}

/**
 * Obtiene servicios disponibles con filtro geográfico opcional
 */
export async function getAvailableServicesFiltered(params?: {
  lat?: number; lng?: number; radius?: number
}): Promise<any> {
  const qs = new URLSearchParams()
  if (params?.lat) qs.set("lat", String(params.lat))
  if (params?.lng) qs.set("lng", String(params.lng))
  if (params?.radius) qs.set("radius", String(params.radius))
  const url = `/services/available${qs.toString() ? "?" + qs.toString() : ""}`
  const response = await fetchWithAuth(url, { method: "GET" })
  if (!response.ok) await handleAPIError(response)
  return response.json()
}

// ============================================
// HELPER - Verificar autenticación
// ============================================

/**
 * Verifica si el usuario está autenticado
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken()
}

/**
 * Verifica si el usuario completó el onboarding
 */
export function hasCompletedOnboarding(): boolean {
  const user = getUser()
  return user?.onboarding_completed === true || !!user?.full_name
}

// ============================================
// GENERIC API CLIENT (USED BY ADMIN/SETTINGS)
// ============================================

export const api = {
  async get(endpoint: string) {
    const res = await fetchWithAuth(endpoint, {
      method: "GET",
    })
    if (!res.ok) await handleAPIError(res)
    return { data: await res.json() }
  },
  async post(endpoint: string, data: any, options: any = {}) {
    const headers: any = {}

    // Si no es FormData, enviamos como JSON
    let body = data
    if (!(data instanceof FormData)) {
      headers["Content-Type"] = "application/json"
      body = JSON.stringify(data)
    }

    // Merge options (para sobreescribir headers si envian form-data explicitamente)
    if (options.headers) {
      for (const key in options.headers) {
        if (options.headers[key] === "multipart/form-data") {
          // Let the browser set the boundary automatically 
          delete headers["Content-Type"]
        } else {
          headers[key] = options.headers[key]
        }
      }
    }

    const res = await fetchWithAuth(endpoint, {
      method: "POST",
      headers,
      body
    })
    if (!res.ok) await handleAPIError(res)
    return { data: await res.json() }
  },
  async put(endpoint: string, data?: any) {
    // Query params vs Body
    const fetchOptions: RequestInit = {
      method: "PUT",
      headers: {}
    }

    if (data) {
      if (!(data instanceof FormData)) {
        (fetchOptions.headers as Record<string, string>)["Content-Type"] = "application/json"
        fetchOptions.body = JSON.stringify(data)
      } else {
        fetchOptions.body = data
      }
    }

    const res = await fetchWithAuth(endpoint, fetchOptions)
    if (!res.ok) await handleAPIError(res)
    return { data: await res.json() }
  },
  async delete(endpoint: string) {
    const res = await fetchWithAuth(endpoint, {
      method: "DELETE",
    })
    if (!res.ok) await handleAPIError(res)
    return { data: await res.json() }
  }
}

export default api;