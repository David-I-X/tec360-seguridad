/**
 * Tec360 Mobile — WebSocket Client
 * Reused from frontend/src/lib/websocket.ts (API is identical in React Native)
 */

const WS_BASE = (process.env.EXPO_PUBLIC_API_URL || "https://tec-360.tech/api")
  .replace(/^http/, "ws")
  .replace(/\/api\/?$/, "");

export interface WebSocketMessage {
  type: string;
  data: any;
}

type MessageHandler = (message: WebSocketMessage) => void;

class ServiceWebSocket {
  private ws: WebSocket | null = null;
  private handlers = new Set<MessageHandler>();
  private serviceId: string | null = null;
  private token: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  connect(serviceId: string, token: string) {
    if (this.ws?.readyState === WebSocket.OPEN && this.serviceId === serviceId) {
      return; // Already connected
    }

    this.disconnect();
    this.serviceId = serviceId;
    this.token = token;

    const wsUrl = `${WS_BASE}/api/ws/${serviceId}?token=${token}`;
    console.log("[WS] Connecting to:", wsUrl);

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log("[WS] Connected to service:", serviceId);
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handlers.forEach((handler) => handler(message));
      } catch (err) {
        console.error("[WS] Parse error:", err);
      }
    };

    this.ws.onclose = (event) => {
      console.log("[WS] Disconnected:", event.code);
      // Don't reconnect on auth errors (403 = Forbidden)
      const reason = event.reason || "";
      if (reason.includes("403") || reason.includes("Forbidden") || event.code === 1008) {
        console.log("[WS] Auth error — not reconnecting");
        return;
      }
      if (this.serviceId && this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        this.reconnectTimeout = setTimeout(() => {
          this.reconnectAttempts++;
          if (this.serviceId && this.token) {
            this.connect(this.serviceId, this.token);
          }
        }, delay);
      }
    };

    this.ws.onerror = () => {
      // Errors are handled in onclose
    };
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.serviceId = null;
    this.token = null;
    this.reconnectAttempts = 0;
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  sendLocationUpdate(lat: number, lng: number) {
    this.send({
      type: "location_update",
      data: { lat, lng },
    });
  }

  onMessage(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Single instance for the app
export const serviceWebSocket = new ServiceWebSocket();
