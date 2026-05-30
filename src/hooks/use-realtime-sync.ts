import { useEffect } from "react";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import type {
  RealtimePostgresChangesPayload,
  RealtimePostgresInsertPayload,
  RealtimePostgresUpdatePayload,
  RealtimePostgresDeletePayload,
} from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";


/**
 * Subscribes to Supabase Realtime changes on key public tables and applies
 * surgical cache updates per event type (INSERT / UPDATE / DELETE) so the UI
 * reflects edits without an extra network round-trip.
 *
 * Strategy per table:
 *   - List caches (arrays): patch in place for INSERT/UPDATE, filter out for DELETE
 *   - Detail caches (single row keyed by id or slug): replace on UPDATE,
 *     remove on DELETE, ignore on INSERT (no key to match yet)
 *   - Caches that depend on filters/joins we cannot reproduce client-side
 *     (e.g. form-submissions joined with templates) fall back to invalidate.
 *
 * Mount once near the root of the app.
 */

type Row = Record<string, unknown> & {
  id?: string;
  slug?: string;
  sort_order?: number;
  updated_at?: string;
};

type ListPatcher = (rows: Row[] | undefined, payload: RealtimePostgresChangesPayload<Row>) => Row[] | undefined;

/** Type guard: true when value is a non-null object with at least an `id` or `slug`. */
const isIdentifiableRow = (v: unknown): v is Row => {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return typeof r.id === "string" || typeof r.slug === "string";
};

/** Type guard: payload carries enough info to patch caches. */
const hasPatchablePayload = (payload: RealtimePostgresChangesPayload<Row>): boolean => {
  switch (payload.eventType) {
    case "INSERT":
    case "UPDATE":
      return isIdentifiableRow((payload as RealtimePostgresInsertPayload<Row>).new);
    case "DELETE":
      return isIdentifiableRow((payload as RealtimePostgresDeletePayload<Row>).old);
    default:
      return false;
  }
};

/** True when an UPDATE event carries fields that affect list ordering. */
const updateAffectsOrder = (payload: RealtimePostgresChangesPayload<Row>): boolean => {
  if (payload.eventType !== "UPDATE") return payload.eventType === "INSERT" || payload.eventType === "DELETE";
  const next = (payload as RealtimePostgresUpdatePayload<Row>).new as Row | undefined;
  const old = (payload as RealtimePostgresUpdatePayload<Row>).old as Row | undefined;
  if (!next) return false;
  // If old is missing (Realtime without REPLICA IDENTITY FULL), assume it might affect order.
  if (!old) return true;
  return next.sort_order !== old.sort_order || next.updated_at !== old.updated_at;
};

type Handler = {
  /** Query keys whose data is `Row[]` and can be patched in place. */
  listKeys?: string[][];
  /** Query keys whose data is a single `Row`, keyed by id or slug. */
  detailKeys?: { key: string[]; matchBy: "id" | "slug" }[];
  /** Query keys we cannot patch precisely — fall back to invalidate on any change. */
  invalidateKeys?: string[][];
  /** Optional custom list patcher (e.g. to keep server-side ordering). */
  patchList?: ListPatcher;
};

const defaultListPatcher: ListPatcher = (rows, payload) => {
  const list = rows ?? [];
  switch (payload.eventType) {
    case "INSERT": {
      const next = (payload as RealtimePostgresInsertPayload<Row>).new;
      if (!isIdentifiableRow(next)) return list;
      if (list.some((r) => r.id === next.id)) return list;
      return [next, ...list];
    }
    case "UPDATE": {
      const next = (payload as RealtimePostgresUpdatePayload<Row>).new;
      if (!isIdentifiableRow(next)) return list;
      return list.map((r) => (r.id === next.id ? { ...r, ...next } : r));
    }
    case "DELETE": {
      const old = (payload as RealtimePostgresDeletePayload<Row>).old;
      if (!isIdentifiableRow(old)) return list;
      return list.filter((r) => r.id !== old.id);
    }
    default:
      return list;
  }
};

/** Re-sort by `sort_order` ascending after a patch (for products, portfolio, contact_info). */
const sortedByOrder: ListPatcher = (rows, payload) => {
  const patched = defaultListPatcher(rows, payload) ?? [];
  if (!updateAffectsOrder(payload)) return patched;
  return [...patched].sort((a, b) => {
    const ao = (a.sort_order as number) ?? 0;
    const bo = (b.sort_order as number) ?? 0;
    if (ao !== bo) return ao - bo;
    // Stable tiebreaker on id so equal sort_orders don't shuffle on every update.
    return String(a.id ?? "").localeCompare(String(b.id ?? ""));
  });
};

/** Re-sort by `updated_at` desc (for pages list). */
const sortedByUpdatedDesc: ListPatcher = (rows, payload) => {
  const patched = defaultListPatcher(rows, payload) ?? [];
  if (!updateAffectsOrder(payload)) return patched;
  return [...patched].sort((a, b) => {
    const at = new Date((a.updated_at as string) || 0).getTime();
    const bt = new Date((b.updated_at as string) || 0).getTime();
    if (at !== bt) return bt - at;
    return String(a.id ?? "").localeCompare(String(b.id ?? ""));
  });
};

const TABLE_HANDLERS: Record<string, Handler> = {
  pages: {
    listKeys: [["pages"], ["admin-pages"]],
    detailKeys: [{ key: ["page"], matchBy: "slug" }],
    patchList: sortedByUpdatedDesc,
  },
  portfolio_projects: {
    listKeys: [["portfolio-projects"], ["admin-portfolio"]],
    detailKeys: [{ key: ["portfolio-project"], matchBy: "slug" }],
    patchList: sortedByOrder,
  },
  contact_info: {
    listKeys: [["contact-info"], ["contact-info-all"]],
    patchList: sortedByOrder,
  },
  site_settings: {
    // Invalidate the raw settings map plus all derived caches (home sections,
    // about timeline) so every page auto-refreshes when admins save changes.
    invalidateKeys: [["site-settings"], ["home-sections"], ["about-timeline"]],
  },
  form_templates: {
    listKeys: [["form-templates"]],
    detailKeys: [{ key: ["form-template"], matchBy: "slug" }],
  },
  form_submissions: {
    // Submissions list is usually filtered/joined per template — invalidate.
    invalidateKeys: [["form-submissions"]],
  },
  chat_messages: {
    // Per-session arrays under ["chat-messages", sessionId]. Patch the matching session list.
    invalidateKeys: [["chat-sessions"]],
  },
  orders: {
    listKeys: [["orders"]],
  },
};

function applyHandler(qc: QueryClient, handler: Handler, payload: RealtimePostgresChangesPayload<Row>, table: string) {
  const patcher = handler.patchList ?? defaultListPatcher;
  const canPatch = hasPatchablePayload(payload);
  const eventType = (payload.eventType ?? "UNKNOWN") as RealtimePostgresChangesPayload<Row>["eventType"];

  // Surface the row identifiers (if any) for the debug panel.
  const rowForId =
    payload.eventType === "DELETE"
      ? (payload as RealtimePostgresDeletePayload<Row>).old
      : (payload as RealtimePostgresInsertPayload<Row> | RealtimePostgresUpdatePayload<Row>).new;
  const rowId = isIdentifiableRow(rowForId) ? rowForId.id : undefined;
  const rowSlug = isIdentifiableRow(rowForId) ? rowForId.slug : undefined;

  // List caches — surgical patch. Skip silently if payload lacks an identifier
  // (prevents accidental writes of `{}` or partial rows into the cache).
  if (canPatch) {
    handler.listKeys?.forEach((key) => {
      qc.setQueriesData<Row[]>({ queryKey: key, exact: false }, (old) => {
        const next = patcher(old, payload);
        return Array.isArray(next) ? next : old;
      });
    });
  }

  // Detail caches — replace or remove the matching single-row cache.
  handler.detailKeys?.forEach(({ key, matchBy }) => {
    if (payload.eventType === "INSERT") return;
    const row =
      payload.eventType === "UPDATE"
        ? (payload as RealtimePostgresUpdatePayload<Row>).new
        : (payload as RealtimePostgresDeletePayload<Row>).old;
    if (!isIdentifiableRow(row)) return;
    const matchValue = row[matchBy];
    if (typeof matchValue !== "string" || matchValue.length === 0) return;
    const fullKey = [...key, matchValue];
    if (payload.eventType === "DELETE") {
      qc.removeQueries({ queryKey: fullKey, exact: true });
    } else {
      qc.setQueryData<Row>(fullKey, (old) => ({ ...(old ?? {}), ...row }));
    }
  });

  // Fallback invalidations (always safe — no payload shape assumptions).
  handler.invalidateKeys?.forEach((key) => {
    qc.invalidateQueries({ queryKey: key });
  });
}

export const useRealtimeSync = () => {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("global-realtime-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public" },
        (payload: RealtimePostgresChangesPayload<Row> & { table?: string }) => {
          const table = payload.table;
          if (!table) return;
          const handler = TABLE_HANDLERS[table];
          if (!handler) return;
          try {
            applyHandler(qc, handler, payload, table);
          } catch (err) {
            // Last-resort fallback: invalidate all known caches for this table
            // so we never leave the UI in a stale state.
            console.warn(`[realtime-sync] patch failed for ${table}, invalidating`, err);
            [
              ...(handler.listKeys ?? []),
              ...(handler.invalidateKeys ?? []),
            ].forEach((key) => {
              qc.invalidateQueries({ queryKey: key });
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
};

// Backwards-compat default export name used in App.tsx
export const RealtimeSync = () => {
  useRealtimeSync();
  return null;
};

export default RealtimeSync;
