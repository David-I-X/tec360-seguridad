/**
 * Validations Schemas - Zod
 * Todas las validaciones del frontend
 */
import { z } from "zod"

// ============================================
// AUTH SCHEMAS
// ============================================

/**
 * Schema para número de teléfono colombiano
 */
export const phoneSchema = z.object({
  phone: z
    .string()
    .min(1, "El número de teléfono es requerido")
    .regex(
      /^\+57\d{10}$/,
      "Debe ser un número colombiano válido (ejemplo: +573001234567)"
    )
    .refine(
      (phone) => phone.length === 13,
      "El número debe tener 10 dígitos después del +57"
    ),
})

export type PhoneFormData = z.infer<typeof phoneSchema>

/**
 * Schema para código OTP
 */
export const otpSchema = z.object({
  code: z
    .string()
    .length(6, "El código debe tener 6 dígitos")
    .regex(/^\d{6}$/, "El código debe contener solo números"),
})

export type OTPFormData = z.infer<typeof otpSchema>

/**
 * Schema para onboarding (completar perfil)
 */
export const onboardingSchema = z.object({
  full_name: z
    .string()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(100, "El nombre es demasiado largo")
    .regex(
      /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
      "El nombre solo puede contener letras y espacios"
    ),
  
  email: z
    .string()
    .optional()
    .refine(
      (email) => !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
      "Email inválido"
    ),
  
  user_type: z.enum(["client", "technician"], {
    errorMap: () => ({ message: "Selecciona un tipo de usuario" }),
  }),
})

export type OnboardingFormData = z.infer<typeof onboardingSchema>

// ============================================
// SERVICE REQUEST SCHEMAS
// ============================================

/**
 * Schema para solicitar un servicio
 */
export const serviceRequestSchema = z.object({
  // Tipo de servicio
  service_type: z.enum(
    [
      "gps_install",
      "gps_maintenance",
      "alarm_install",
      "alarm_maintenance",
      "camera_install",
      "camera_maintenance",
      "other",
    ],
    {
      errorMap: () => ({ message: "Selecciona un tipo de servicio" }),
    }
  ),

  // Descripción
  description: z
    .string()
    .min(20, "La descripción debe tener al menos 20 caracteres")
    .max(500, "La descripción es demasiado larga"),

  // Dirección
  address: z
    .string()
    .min(10, "La dirección debe ser más específica")
    .max(200, "La dirección es demasiado larga"),

  // Ciudad
  city: z
    .string()
    .min(3, "La ciudad es requerida")
    .max(50, "Nombre de ciudad inválido"),

  // Coordenadas (opcionales, se llenan con Google Maps)
  latitude: z.number().optional(),
  longitude: z.number().optional(),

  // Fecha deseada
  preferred_date: z
    .string()
    .refine(
      (date) => {
        const selectedDate = new Date(date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return selectedDate >= today
      },
      "La fecha debe ser hoy o posterior"
    ),

  // Hora preferida (opcional)
  preferred_time: z.enum(["morning", "afternoon", "evening", "any"], {
    errorMap: () => ({ message: "Selecciona una franja horaria" }),
  }).optional(),

  // Notas adicionales
  notes: z.string().max(300, "Las notas son demasiado largas").optional(),
})

export type ServiceRequestFormData = z.infer<typeof serviceRequestSchema>

/**
 * Schema combinado: Onboarding + Service Request
 * Para cuando el usuario solicita servicio por primera vez
 */
export const fullServiceRequestSchema = onboardingSchema.merge(
  serviceRequestSchema
)

export type FullServiceRequestFormData = z.infer<
  typeof fullServiceRequestSchema
>

// ============================================
// REVIEW SCHEMAS
// ============================================

/**
 * Schema para dejar una reseña
 */
export const reviewSchema = z.object({
  rating: z
    .number()
    .min(1, "Debes seleccionar una calificación")
    .max(5, "La calificación máxima es 5"),

  comment: z
    .string()
    .min(10, "El comentario debe tener al menos 10 caracteres")
    .max(500, "El comentario es demasiado largo"),
})

export type ReviewFormData = z.infer<typeof reviewSchema>

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Formatea un número de teléfono a formato internacional
 * Ejemplo: "3001234567" → "+573001234567"
 */
export function formatPhoneNumber(phone: string): string {
  // Remover espacios, guiones y paréntesis
  const cleaned = phone.replace(/[\s\-()]/g, "")
  
  // Si ya tiene +57, retornar
  if (cleaned.startsWith("+57")) {
    return cleaned
  }
  
  // Si tiene 57 al inicio sin +, agregar +
  if (cleaned.startsWith("57") && cleaned.length === 12) {
    return `+${cleaned}`
  }
  
  // Si solo tiene 10 dígitos, agregar +57
  if (cleaned.length === 10) {
    return `+57${cleaned}`
  }
  
  return cleaned
}

/**
 * Enmascara un número de teléfono para privacidad
 * Ejemplo: "+573001234567" → "+57 300 *** 4567"
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 8) return phone
  
  // Formato: +57 300 *** 4567
  const countryCode = phone.slice(0, 3)  // +57
  const areaCode = phone.slice(3, 6)     // 300
  const lastDigits = phone.slice(-4)      // 4567
  
  return `${countryCode} ${areaCode} *** ${lastDigits}`
}

/**
 * Valida si un teléfono es colombiano
 */
export function isColombianPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, "")
  return /^\+57\d{10}$/.test(cleaned)
}

/**
 * Mapeo de tipos de servicio a etiquetas legibles
 */
export const SERVICE_TYPE_LABELS: Record<string, string> = {
  gps_install: "Instalación de GPS",
  gps_maintenance: "Mantenimiento de GPS",
  alarm_install: "Instalación de Alarma",
  alarm_maintenance: "Mantenimiento de Alarma",
  camera_install: "Instalación de Cámaras",
  camera_maintenance: "Mantenimiento de Cámaras",
  other: "Otro servicio",
}

/**
 * Mapeo de franjas horarias a etiquetas
 */
export const TIME_SLOT_LABELS: Record<string, string> = {
  morning: "Mañana (8am - 12pm)",
  afternoon: "Tarde (12pm - 5pm)",
  evening: "Noche (5pm - 8pm)",
  any: "Cualquier hora",
}