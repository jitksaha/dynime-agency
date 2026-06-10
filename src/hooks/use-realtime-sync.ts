/**
 * useRealtimeSync / RealtimeSync — NO-OP STUB
 * Supabase Realtime has been removed. The Laravel backend is a standard REST API.
 * React Query's built-in polling (staleTime, refetchInterval, refetchOnWindowFocus)
 * provides sufficient freshness for all admin pages.
 *
 * Drop this component anywhere it was previously mounted — it renders nothing
 * and has no side-effects.
 */

export const useRealtimeSync = () => {
  // No-op: Supabase Realtime removed
};

export const RealtimeSync = () => {
  useRealtimeSync();
  return null;
};

export default RealtimeSync;
