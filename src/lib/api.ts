/**
 * Thin client for calling the NestJS backend (/api/v1/*).
 * Uses NestJS JWT tokens from localStorage (auto-refresh on expiry).
 */
import {
  getNestAccessToken,
  clearNestTokens,
  refreshNestTokens,
} from './nestjs-tokens';

export const API_BASE = '/api/v1';

async function token(): Promise<string | null> {
  let tok = getNestAccessToken();
  if (!tok) {
    const refreshed = await refreshNestTokens();
    if (refreshed) tok = getNestAccessToken();
  }
  return tok;
}

function authHeader(tok: string | null): Record<string, string> {
  return tok ? { Authorization: `Bearer ${tok}` } : {};
}

async function request(
  path: string,
  init: (tok: string | null) => RequestInit,
): Promise<Response> {
  const tok = await token();
  const res = await fetch(`${API_BASE}${path}`, init(tok));
  if (res.status === 401) {
    clearNestTokens();
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
