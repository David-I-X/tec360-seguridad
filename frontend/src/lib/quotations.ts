/**
 * API client para cotizaciones
 * Path: frontend/src/lib/quotations.ts
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

function getAuthToken(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem("access_token")
}

async function handleAPIError(response: Response): Promise<never> {
    let errorData: any
    try {
        errorData = await response.json()
    } catch {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
    }

    if (errorData.detail) {
        if (typeof errorData.detail === "string") {
            throw new Error(errorData.detail)
        }
        if (Array.isArray(errorData.detail)) {
            throw new Error(errorData.detail.map((e: any) => e.msg).join(", "))
        }
    }

    throw new Error(errorData.error || "Error desconocido")
}

// ============================================
// TIPOS
// ============================================

export interface Quotation {
    id: string
    service_id: string
    technician_id: string
    amount: number
    description: string
    status: "pending" | "approved" | "rejected" | "counter_offered" | "expired" | "cancelled"
    client_response?: string
    counter_amount?: number
    expires_at?: string
    created_at: string
    updated_at?: string
    responded_at?: string
    technician_name?: string
    technician_rating?: number
    technician_total_services?: number
}

export interface QuotationCreate {
    amount: number
    description: string
    expires_in_hours?: number
}

export interface QuotationCounterOffer {
    counter_amount: number
    client_response?: string
}

export interface QuotationListResponse {
    quotations: Quotation[]
    total: number
    page: number
    page_size: number
    total_pages: number
}

// ============================================
// FUNCIONES DE TÉCNICO
// ============================================

/**
 * Técnico envía cotización para un servicio
 */
export async function createQuotation(
    serviceId: string,
    data: QuotationCreate
): Promise<Quotation> {
    const token = getAuthToken()
    if (!token) throw new Error("No autenticado")

    const response = await fetch(`${API_URL}/quotations/service/${serviceId}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    })

    if (!response.ok) await handleAPIError(response)
    return response.json()
}

/**
 * Técnico obtiene sus cotizaciones enviadas
 */
export async function getMyQuotations(
    statusFilter?: string,
    page: number = 1,
    pageSize: number = 10
): Promise<QuotationListResponse> {
    const token = getAuthToken()
    if (!token) throw new Error("No autenticado")

    const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
    })
    if (statusFilter) params.append("status_filter", statusFilter)

    const response = await fetch(`${API_URL}/quotations/me?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) await handleAPIError(response)
    return response.json()
}

// ============================================
// FUNCIONES DE SERVICIO
// ============================================

/**
 * Obtener cotizaciones de un servicio
 */
export async function getServiceQuotations(serviceId: string): Promise<Quotation[]> {
    const token = getAuthToken()
    if (!token) throw new Error("No autenticado")

    const response = await fetch(`${API_URL}/quotations/service/${serviceId}`, {
        headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) await handleAPIError(response)
    return response.json()
}

// ============================================
// FUNCIONES DE CLIENTE
// ============================================

/**
 * Cliente aprueba una cotización
 */
export async function approveQuotation(quotationId: string): Promise<Quotation> {
    const token = getAuthToken()
    if (!token) throw new Error("No autenticado")

    const response = await fetch(`${API_URL}/quotations/${quotationId}/approve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) await handleAPIError(response)
    return response.json()
}

/**
 * Cliente rechaza una cotización
 */
export async function rejectQuotation(
    quotationId: string,
    reason?: string
): Promise<Quotation> {
    const token = getAuthToken()
    if (!token) throw new Error("No autenticado")

    const response = await fetch(`${API_URL}/quotations/${quotationId}/reject`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ client_response: reason }),
    })

    if (!response.ok) await handleAPIError(response)
    return response.json()
}

/**
 * Cliente hace contraoferta
 */
export async function counterOfferQuotation(
    quotationId: string,
    data: QuotationCounterOffer
): Promise<Quotation> {
    const token = getAuthToken()
    if (!token) throw new Error("No autenticado")

    const response = await fetch(`${API_URL}/quotations/${quotationId}/counter`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    })

    if (!response.ok) await handleAPIError(response)
    return response.json()
}
