/**
 * WebSocket Client for Real-Time Tracking
 * Manages connection to backend WebSocket for service updates and location tracking
 */

// Build WebSocket URL from API URL
function getWsUrl(): string {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    // Replace http:// with ws:// and https:// with wss://
    return apiUrl.replace(/^http/, "ws")
}

const WS_URL = getWsUrl()

export type WebSocketMessage =
    | { type: "connected"; data: { service_id?: string; user_id: string } }
    | { type: "status_update"; data: { service_id: string; status: string; technician?: any } }
    | { type: "location_update"; data: { technician_id: string; lat: number; lng: number; timestamp: number } }
    | { type: "pong" }

type MessageHandler = (message: WebSocketMessage) => void

class ServiceWebSocket {
    private ws: WebSocket | null = null
    private serviceId: string | null = null
    private token: string | null = null
    private handlers: Set<MessageHandler> = new Set()
    private reconnectAttempts = 0
    private maxReconnectAttempts = 5
    private reconnectTimeout: NodeJS.Timeout | null = null
    private pingInterval: NodeJS.Timeout | null = null

    connect(serviceId: string, token: string) {
        // Don't connect during SSR
        if (typeof window === "undefined") return

        if (this.ws?.readyState === WebSocket.OPEN) {
            this.disconnect()
        }

        this.serviceId = serviceId
        this.token = token

        const url = `${WS_URL}/ws/service/${serviceId}?token=${token}`
        console.log("[WS] Connecting to:", url.replace(token, "***"))

        try {
            this.ws = new WebSocket(url)

            this.ws.onopen = () => {
                console.log("[WS] Connected to service room:", serviceId)
                this.reconnectAttempts = 0
                this.startPingInterval()
            }

            this.ws.onmessage = (event) => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data)
                    this.handlers.forEach(handler => handler(message))
                } catch (e) {
                    console.error("[WS] Failed to parse message:", e)
                }
            }

            this.ws.onclose = (event) => {
                console.log("[WS] Connection closed:", event.code, event.reason || "(no reason)")
                this.stopPingInterval()
                // Only reconnect if it wasn't a normal close
                if (event.code !== 1000) {
                    this.attemptReconnect()
                }
            }

            this.ws.onerror = () => {
                // WebSocket errors don't provide useful info, just log connection failure
                console.warn("[WS] Connection error - server may be unavailable")
            }
        } catch (error) {
            console.error("[WS] Failed to create WebSocket:", error)
        }
    }

    private startPingInterval() {
        this.pingInterval = setInterval(() => {
            this.send({ type: "ping" })
        }, 30000) // Ping every 30 seconds
    }

    private stopPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval)
            this.pingInterval = null
        }
    }

    private attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log("[WS] Max reconnect attempts reached")
            return
        }

        if (!this.serviceId || !this.token) return

        this.reconnectAttempts++
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)

        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)

        this.reconnectTimeout = setTimeout(() => {
            this.connect(this.serviceId!, this.token!)
        }, delay)
    }

    disconnect() {
        this.stopPingInterval()

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout)
            this.reconnectTimeout = null
        }

        if (this.ws) {
            this.ws.close()
            this.ws = null
        }

        this.serviceId = null
        this.token = null
        this.reconnectAttempts = 0
    }

    send(data: any) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data))
        }
    }

    /**
     * Send location update to the service room (for technicians)
     */
    sendLocationUpdate(lat: number, lng: number) {
        this.send({
            type: "location_update",
            data: { lat, lng }
        })
    }

    onMessage(handler: MessageHandler) {
        this.handlers.add(handler)
        return () => this.handlers.delete(handler)
    }

    get isConnected() {
        return this.ws?.readyState === WebSocket.OPEN
    }
}

// Single instance for the app
export const serviceWebSocket = new ServiceWebSocket()
