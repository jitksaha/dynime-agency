/**
 * useSocket — NO-OP STUB
 * Socket.IO (NestJS) has been replaced with Laravel REST API.
 * Real-time updates are handled via React Query polling (staleTime / refetchInterval).
 */

const stubSocket = {
  on: () => {},
  off: () => {},
  emit: () => {},
};

export const getSocket = () => stubSocket;

export function useSocket() {
  return {
    socket: stubSocket,
    connected: false,
    joinOrderRoom: (_orderId: string) => {},
    leaveOrderRoom: (_orderId: string) => {},
  };
}

