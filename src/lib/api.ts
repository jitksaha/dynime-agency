/**
 * Thin client for calling the NestJS backend (/api/v1/*).
 *
 * Token priority (per request):
 *   1. NestJS access token (localStorage) — preferred post-seam-flip
 *   2. Silently refreshed NestJS token    — if access token expired
 *   3. Supabase session token             — strangler-fig fallback
 *
 * On 401, the token store is cleared and the Supabase fallback is tried once
 * so that any page that hasn't re-obtained a NestJS token yet still works.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  getBestToken,
  clearNestTokens,
  exchangeForNestTokens,
} from './nestjs-tokens';

export const API_BASE = '/api/v1';

async function supabaseToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function token(): Promise<string | null> {
  return getBestToken(supabaseToken);
}

function authHeader(tok: string | null): Record<string, string> {
  return tok ? { Authorization: `Bearer ${tok}` } : {};
}

/** Re-attempt request with Supabase token after a NestJS-token 401. */
async function retryWithSupabase(
  factory: (tok: string | null) => Promise<Response>,
): Promise<Response> {
  clearNestTokens();
  const sbTok = await supabaseToken();
  // If we have a Supabase token, try exchanging it for a fresh NestJS token.
  if (sbTok) exchangeForNestTokens(sbTok).catch(() => {});
  return factory(sbTok);
}

async function request(
  path: string,
  init: (tok: string | null) => RequestInit,
): Promise<Response> {
  const tok = await token();
  let res = await fetch(`${API_BASE}${path}`, init(tok));

  if (res.status === 401 && tok) {
    res = await retryWithSupabase((sbTok) =>
      fetch(`${API_BASE}${path}`, init(sbTok)),
    );
  }

  return res;
}

async function parseOk<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const res = await request(path, (tok) => ({ headers: authHeader(tok) }));
  return parseOk<T>(res);
}

export async function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await request(path, (tok) => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(tok) },
    body: JSON.stringify(body),
  }));
  return parseOk<T>(res);
}

export async function apiPatch<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await request(path, (tok) => ({
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader(tok) },
    body: JSON.stringify(body),
  }));
  return parseOk<T>(res);
}

export async function apiDelete<T = unknown>(path: string): Promise<T> {
  const res = await request(path, (tok) => ({
    method: 'DELETE',
    headers: authHeader(tok),
  }));
  return parseOk<T>(res);
}
