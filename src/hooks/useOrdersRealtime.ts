import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to realtime changes on the `orders` table and invalidate
 * the given react-query keys whenever an INSERT/UPDATE/DELETE arrives.
 *
 * Pass a stable channel name per page so multiple mounted views don't collide.
 */
export function useOrdersRealtime(channelName: string, queryKeys: (string | (string | undefined)[])[]) {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          for (const key of queryKeys) {
            qc.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, JSON.stringify(queryKeys)]);
}
