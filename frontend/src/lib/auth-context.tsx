"use client"

/**
 * Auth Context
 * Maneja el estado global de autenticación
 */

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  requestOTP as apiRequestOTP,
  verifyOTP as apiVerifyOTP,
  completeOnboarding as apiCompleteOnboarding,
  logout as apiLogout,
  getUser,
  isAuthenticated as checkIsAuthenticated,
  hasCompletedOnboarding as checkHasCompletedOnboarding,
  clearTokens,
} from "./api"

// ============================================
// TIPOS
// ============================================

interface User {
  id: string
  phone: string
  email?: string
  full_name?: string
  role?: string
  onboarding_completed?: boolean
  user_metadata?: Record<string, any>
}

interface AuthContextType {
  // Estado
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  hasCompletedOnboarding: boolean

  // Funciones
  requestOTP: (phone: string) => Promise<{ success: boolean; message: string }>
  verifyOTP: (
    phone: string,
    code: string
  ) => Promise<{ success: boolean; isNewUser: boolean }>
  completeOnboarding: (data: {
    full_name: string
    email?: string
    user_type: "client" | "technician"
  }) => Promise<void>
  logout: () => void
  refreshUser: () => void
}

// ============================================
// CONTEXT
// ============================================

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ============================================
// PROVIDER
// ============================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Cargar usuario al montar el componente
  useEffect(() => {
    loadUser()
  }, [])

  // Función para cargar usuario desde localStorage
  const loadUser = () => {
    try {
      const userData = getUser()
      if (userData) {
        setUser(userData)
      }
    } catch (error) {
      console.error("Error loading user:", error)
      clearTokens()
    } finally {
      setIsLoading(false)
    }
  }

  // Función para refrescar el usuario
  const refreshUser = () => {
    loadUser()
  }

  // Solicitar OTP
  const requestOTP = async (
    phone: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await apiRequestOTP(phone)
      return {
        success: true,
        message: response.message,
      }
    } catch (error: any) {
      throw new Error(error.message || "Error al enviar código")
    }
  }

  // Verificar OTP
  const verifyOTP = async (
    phone: string,
    code: string
  ): Promise<{ success: boolean; isNewUser: boolean }> => {
    try {
      const response = await apiVerifyOTP(phone, code)

      // Actualizar estado del usuario
      setUser(response.user)

      return {
        success: true,
        isNewUser: response.is_new_user,
      }
    } catch (error: any) {
      throw new Error(error.message || "Código incorrecto")
    }
  }

  // Completar onboarding
  const completeOnboarding = async (data: {
    full_name: string
    email?: string
    user_type: "client" | "technician"
  }): Promise<void> => {
    try {
      const response = await apiCompleteOnboarding(data)

      // Actualizar estado del usuario
      setUser(response.user)
    } catch (error: any) {
      throw new Error(error.message || "Error al completar perfil")
    }
  }

  // Cerrar sesión
  const logout = () => {
    apiLogout()
    setUser(null)
    router.push("/")
  }

  // Valores del contexto
  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: checkIsAuthenticated() && !!user,
    hasCompletedOnboarding:
      checkHasCompletedOnboarding() || !!user?.full_name,
    requestOTP,
    verifyOTP,
    completeOnboarding,
    logout,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ============================================
// HOOK
// ============================================

/**
 * Hook para usar el contexto de autenticación
 */
export function useAuth() {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }

  return context
}

// ============================================
// COMPONENTE PARA PROTEGER RUTAS
// ============================================

interface ProtectedRouteProps {
  children: React.ReactNode
  requireOnboarding?: boolean
  redirectTo?: string
  allowedRoles?: string[]
}

/**
 * Componente para proteger rutas que requieren autenticación
 */
export function ProtectedRoute({
  children,
  requireOnboarding = false,
  redirectTo = "/auth/phone",
  allowedRoles,
}: ProtectedRouteProps) {
  const { isAuthenticated, hasCompletedOnboarding, isLoading, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    // Si no está autenticado, redirigir a login
    if (!isAuthenticated) {
      router.push(redirectTo)
      return
    }

    // Si requiere onboarding y no lo ha completado, redirigir
    if (requireOnboarding && !hasCompletedOnboarding) {
      // No redirigir, solo mostrar el formulario de onboarding
      // El componente hijo manejará esto
      return
    }

    // Verificar roles permitidos
    if (allowedRoles && allowedRoles.length > 0 && user?.role) {
      if (!allowedRoles.includes(user.role)) {
        // Role-aware redirect when user doesn't have the required role
        const fallback = user.role === "technician" ? "/tecnicos/dashboard" : "/servicios"
        router.push(fallback)
        return
      }
    }
  }, [
    isAuthenticated,
    hasCompletedOnboarding,
    isLoading,
    requireOnboarding,
    redirectTo,
    router,
    allowedRoles,
    user?.role,
  ])

  // Mostrar loading mientras carga
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Si no está autenticado, no mostrar nada (ya redirigió)
  if (!isAuthenticated) {
    return null
  }

  // Si no tiene el rol permitido, no mostrar nada
  if (allowedRoles && allowedRoles.length > 0 && user?.role && !allowedRoles.includes(user.role)) {
    return null
  }

  return <>{children}</>
}

// ============================================
// COMPONENTE PARA RUTAS PÚBLICAS SOLAMENTE
// ============================================

interface PublicOnlyRouteProps {
  children: React.ReactNode
  redirectTo?: string
}

/**
 * Componente para rutas que solo usuarios no autenticados pueden ver
 * (como login/register)
 */
export function PublicOnlyRoute({
  children,
  redirectTo,
}: PublicOnlyRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    // Si está autenticado, redirigir según rol
    if (isAuthenticated) {
      if (redirectTo) {
        router.push(redirectTo)
      } else {
        // Role-aware redirect
        const destination = user?.role === "technician" ? "/tecnicos/dashboard" : "/servicios"
        router.push(destination)
      }
    }
  }, [isAuthenticated, isLoading, redirectTo, router, user?.role])

  // Mostrar loading mientras carga
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Si está autenticado, no mostrar nada (ya redirigió)
  if (isAuthenticated) {
    return null
  }

  return <>{children}</>
}