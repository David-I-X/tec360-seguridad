import { fetchWithAuth } from "@/lib/api"

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
    try {
        const params = new URLSearchParams({ limit: limit.toString() })
        if (unreadOnly) params.append("unread_only", "true")

        const response = await fetchWithAuth(`/notifications?${params}`, { method: "GET" })
        if (!response.ok) return []
        return response.json()
    } catch {
        return []
    }
}

export async function getUnreadCount(): Promise<number> {
    try {
        const response = await fetchWithAuth("/notifications/unread-count", { method: "GET" })
        if (!response.ok) return 0
        const data = await response.json()
        return data.unread_count || 0
    } catch {
        return 0
    }
}

export async function markAsRead(notificationId: string): Promise<boolean> {
    try {
        const response = await fetchWithAuth(`/notifications/${notificationId}/read`, {
            method: "PATCH",
        })
        return response.ok
    } catch {
        return false
    }
}

export async function markAllAsRead(): Promise<boolean> {
    try {
        const response = await fetchWithAuth("/notifications/read-all", {
            method: "PATCH",
        })
        return response.ok
    } catch {
        return false
    }
}
