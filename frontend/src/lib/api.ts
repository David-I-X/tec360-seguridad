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
  const token = getAuthToken()

  if (!token) {
    throw new Error("No estás autenticado")
  }

  const response = await fetch(`${API_URL}/auth/onboarding`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
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
  const token = getAuthToken()

  if (!token) {
    throw new Error("No estás autenticado")
  }

  const response = await fetch(`${API_URL}/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
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
  scheduled_date: string
  client_notes?: string
  estimated_price?: number
  vehicle_type?: string
  vehicle_model?: string
  vehicle_plate?: string
}): Promise<any> {
  const token = getAuthToken()

  if (!token) {
    throw new Error("No estás autenticado")
  }

  const response = await fetch(`${API_URL}/services`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
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
  const token = getAuthToken()
  if (!token) throw new Error("No autenticado")

  const response = await fetch(`${API_URL}/services/available`, {
    headers: { Authorization: `Bearer ${token}` }
  })

  if (!response.ok) await handleAPIError(response)
  return response.json()
}

/**
 * Acepta un servicio (Self-Assignment)
 * Solo para técnicos
 */
export async function acceptService(serviceId: string): Promise<any> {
  const token = getAuthToken()
  if (!token) throw new Error("No autenticado")

  const response = await fetch(`${API_URL}/services/${serviceId}/accept`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  })

  if (!response.ok) await handleAPIError(response)
  return response.json()
}

/**
 * Obtiene los servicios del usuario actual
 */
export async function getUserServices(): Promise<any> {
  const token = getAuthToken()

  if (!token) {
    throw new Error("No estás autenticado")
  }

  const response = await fetch(`${API_URL}/services`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
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
  const token = getAuthToken()

  if (!token) {
    throw new Error("No estás autenticado")
  }

  const response = await fetch(`${API_URL}/services/${serviceId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    await handleAPIError(response)
  }

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