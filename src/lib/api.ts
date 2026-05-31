/**
 * Thin client for calling the NestJS backend (/api/v1/*).
 * Automatically attaches the current Supabase access token as a Bearer header.
 */
import { supabase } from '@/integrations/supabase/client';

export const API_BASE = '/api/v1';

async function token(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function authHeader(tok: string | null): Record<string, string> {
  return tok ? { Authorization: `Bearer ${tok}` } : {};
}

export async function apiPost<T = unknown>(
  path: string,
  body: unknown,
): Promise<T> {
  const tok = await token();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(tok),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(
      (err as { message?: string }).message ?? `HTTP ${res.status}`,
    );
  }
  return res.json() as Promise<T>;
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const tok = await token();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: authHeader(tok),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(
      (err as { message?: string }).message ?? `HTTP ${res.status}`,
    );
  }
  return res.json() as Promise<T>;
}
