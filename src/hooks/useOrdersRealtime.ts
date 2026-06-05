import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/hooks/useSocket";

/**
 * Subscribe to realtime changes via Socket.IO WebSockets
 * and invalidate the given react-query keys whenever updates arrive.
 */
export function useOrdersRealtime(channelName: string, queryKeys: (string | (string | undefined)[])[]) {
  const qc = useQueryClient();
  const { socket, connected, joinOrderRoom, leaveOrderRoom } = useSocket();

  useEffect(() => {
    // Determine if we should join a specific order's room based on the channel name pattern
    let orderId: string | null = null;
    if (channelName.startsWith("admin-order-detail-")) {
      orderId = channelName.replace("admin-order-detail-", "");
    } else if (channelName.startsWith("order-detail-")) {
      orderId = channelName.replace("order-detail-", "");
    }

    if (orderId && orderId !== "none" && orderId !== "undefined") {
      joinOrderRoom(orderId);
    }

    const handleOrderUpdated = (data: any) => {
      console.log(`[useOrdersRealtime] Received order-updated on channel ${channelName}:`, data);
      
      // If we are listening to a specific order ID room, verify it matches
      if (orderId && data?.orderId && data.orderId !== orderId) {
        return;
      }
      
      // Invalidate queries to refresh data in the UI
      for (const key of queryKeys) {
        qc.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
      }
    };

    socket.on("order-updated", handleOrderUpdated);

    return () => {
      socket.off("order-updated", handleOrderUpdated);
      if (orderId && orderId !== "none" && orderId !== "undefined") {
        leaveOrderRoom(orderId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, channelName, JSON.stringify(queryKeys), qc]);

  // When socket connects or reconnects, perform a full cache invalidation to sync client status
  useEffect(() => {
    if (connected) {
      console.log(`[useOrdersRealtime] Socket connected/reconnected, triggering sync for:`, queryKeys);
      for (const key of queryKeys) {
        qc.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
      }
    }
  }, [connected, JSON.stringify(queryKeys), qc]);
}
