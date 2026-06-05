import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getNestAccessToken } from "@/lib/nestjs-tokens";

// Base URL resolver for Socket.IO
const getSocketUrl = (): string => {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl && apiUrl.startsWith("http")) {
    try {
      return new URL(apiUrl).origin;
    } catch {
      // ignore
    }
  }
  if (import.meta.env.DEV) {
    return "http://localhost:3001";
  }
  return window.location.origin;
};

// Singleton socket instance to avoid multiple concurrent socket connections
let socketInstance: Socket | null = null;
const activeRooms = new Set<string>();

export const getSocket = (): Socket => {
  if (!socketInstance) {
    const url = getSocketUrl();
    console.log("[useSocket] Initializing Socket.IO connection to:", url);

    socketInstance = io(`${url}/realtime`, {
      transports: ["websocket", "polling"],
      autoConnect: false,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      auth: (cb) => {
        cb({ token: getNestAccessToken() });
      },
    });

    // Handle auto-rejoining rooms on reconnect
    socketInstance.on("connect", () => {
      console.log("[useSocket] Socket connected:", socketInstance?.id);
      
      // Rejoin any active rooms tracked by the client
      activeRooms.forEach((room) => {
        if (room.startsWith("order:")) {
          const orderId = room.split(":")[1];
          console.log(`[useSocket] Re-subscribing to room order:${orderId} after reconnect`);
          socketInstance?.emit("subscribe_order", { orderId });
        }
      });
    });

    socketInstance.on("disconnect", (reason) => {
      console.log("[useSocket] Socket disconnected:", reason);
    });
  }
  return socketInstance;
};

export function useSocket() {
  const [connected, setConnected] = useState<boolean>(false);
  const socket = getSocket();

  useEffect(() => {
    // Sync initial state
    setConnected(socket.connected);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    // If not connected, connect
    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);

  // Utility to join order-specific room
  const joinOrderRoom = (orderId: string) => {
    const room = `order:${orderId}`;
    if (!activeRooms.has(room)) {
      activeRooms.add(room);
      if (socket.connected) {
        socket.emit("subscribe_order", { orderId });
      }
    }
  };

  // Utility to leave order-specific room
  const leaveOrderRoom = (orderId: string) => {
    const room = `order:${orderId}`;
    activeRooms.delete(room);
    if (socket.connected) {
      socket.emit("unsubscribe_order", { orderId });
    }
  };

  return {
    socket,
    connected,
    joinOrderRoom,
    leaveOrderRoom,
  };
}
