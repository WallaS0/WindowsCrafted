import { Device, Command, Activity } from "@shared/schema";

export type SocketMessage = 
  | { type: "AUTH"; userId?: number; deviceId?: string; token?: string }
  | { type: "DEVICE_STATUS_CHANGED"; deviceId: string; status: string }
  | { type: "DEVICE_REMOVED"; deviceId: string }
  | { type: "DEVICE_INFO_UPDATED"; deviceId: string; info: any }
  | { type: "COMMAND"; command: Command }
  | { type: "COMMAND_RESPONSE"; commandId: number; status: string; result?: string }
  | { type: "COMMAND_STATUS_CHANGED"; commandId: number; status: string; result?: string }
  | { type: "ACTIVITY_CREATED"; activity: Activity }
  // Remote control messages
  | { type: "REMOTE_FRAME"; imageData: string; timestamp: number; deviceId: string; sessionId: string }
  | { type: "REMOTE_DISCONNECTED"; deviceId: string; sessionId: string; reason?: string }
  | { type: "REMOTE_MOUSE_CLICK"; x: number; y: number; sessionId: string }
  | { type: "REMOTE_KEYBOARD_INPUT"; text: string; sessionId: string }
  | { type: "REMOTE_SESSION_STARTED"; deviceId: string; sessionId: string }
  | { type: "REMOTE_SESSION_ENDED"; deviceId: string; sessionId: string };

class SocketClient {
  private socket: WebSocket | null = null;
  private messageHandlers: Map<string, ((data: any) => void)[]> = new Map();
  private reconnectInterval: number = 3000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting: boolean = false;

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN || this.isConnecting) return;
    
    this.isConnecting = true;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    this.socket = new WebSocket(wsUrl);
    
    this.socket.onopen = () => {
      console.log("WebSocket connected");
      this.isConnecting = false;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    };
    
    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as SocketMessage;
        this.handleMessage(message);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
    
    this.socket.onclose = () => {
      console.log("WebSocket disconnected, reconnecting...");
      this.isConnecting = false;
      this.reconnect();
    };
    
    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      this.socket?.close();
    };
  }

  private reconnect() {
    if (this.reconnectTimer) return;
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectInterval);
  }

  send(message: SocketMessage) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket not connected, message not sent:", message);
      this.connect();
    }
  }

  private handleMessage(message: SocketMessage) {
    const handlers = this.messageHandlers.get(message.type) || [];
    handlers.forEach(handler => handler(message));
  }

  on(type: SocketMessage["type"], handler: (data: any) => void) {
    const handlers = this.messageHandlers.get(type) || [];
    this.messageHandlers.set(type, [...handlers, handler]);
    
    return () => {
      const currentHandlers = this.messageHandlers.get(type) || [];
      this.messageHandlers.set(
        type,
        currentHandlers.filter(h => h !== handler)
      );
    };
  }

  authenticate(userId: number) {
    this.send({ type: "AUTH", userId });
  }

  close() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.messageHandlers.clear();
  }
}

export const socketClient = new SocketClient();
