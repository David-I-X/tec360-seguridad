/**
 * Notifications API Client
 * Functions for interacting with the notifications API
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

function getAuthToken(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem("access_token")
}

export interface Notification {
    id: string
    user_id: string
    title: string
    message: string
    notification_type: "info" | "service" | "status" | "alert"
    is_read: boolean
    service_id: string | null
    created_at: string
}

export async function getNotifications(limit = 20, unreadOnly = false): Promise<Notification[]> {
    const token = getAuthToken()
    if (!token) return []

    try {
        const params = new URLSearchParams({ limit: limit.toString() })
        if (unreadOnly) params.append("unread_only", "true")

        const response = await fetch(`${API_URL}/notifications?${params}`, {
            headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) return []
        return response.json()
    } catch (error) {
        console.error("Failed to fetch notifications:", error)
        return []
    }
}

export async function getUnreadCount(): Promise<number> {
    const token = getAuthToken()
    if (!token) return 0

    try {
        const response = await fetch(`${API_URL}/notifications/unread-count`, {
            headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) return 0
        const data = await response.json()
        return data.unread_count || 0
    } catch (error) {
        console.error("Failed to fetch unread count:", error)
        return 0
    }
}

export async function markAsRead(notificationId: string): Promise<boolean> {
    const token = getAuthToken()
    if (!token) return false

    try {
        const response = await fetch(`${API_URL}/notifications/${notificationId}/read`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
        })
        return response.ok
    } catch (error) {
        console.error("Failed to mark as read:", error)
        return false
    }
}

export async function markAllAsRead(): Promise<boolean> {
    const token = getAuthToken()
    if (!token) return false

    try {
        const response = await fetch(`${API_URL}/notifications/read-all`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
        })
        return response.ok
    } catch (error) {
        console.error("Failed to mark all as read:", error)
        return false
    }
}
