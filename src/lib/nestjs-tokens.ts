/**
 * NestJS token store — persists access + refresh tokens in localStorage.
 * Used by api.ts to prefer NestJS JWTs over Supabase tokens for all
 * /api/v1/* calls. Falls back gracefully when tokens aren't yet present.
 */

const KEY_ACCESS = 'nj_at';
const KEY_REFRESH = 'nj_rt';
const KEY_EXPIRY = 'nj_exp';

export interface NestTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export function setNestTokens({ accessToken, refreshToken, expiresIn }: NestTokens): void {
  localStorage.setItem(KEY_ACCESS, accessToken);
  localStorage.setItem(KEY_REFRESH, refreshToken);
  // Store the absolute expiry minus a 30 s buffer so we refresh proactively.
  localStorage.setItem(KEY_EXPIRY, String(Date.now() + (expiresIn - 30) * 1000));
}

export function getNestAccessToken(): string | null {
  const token = localStorage.getItem(KEY_ACCESS);
  const expiry = Number(localStorage.getItem(KEY_EXPIRY) ?? '0');
  if (!token || Date.now() > expiry) return null;
  return token;
}

export function getNestRefreshToken(): string | null {
  return localStorage.getItem(KEY_REFRESH);
}

export function clearNestTokens(): void {
  localStorage.removeItem(KEY_ACCESS);
  localStorage.removeItem(KEY_REFRESH);
  localStorage.removeItem(KEY_EXPIRY);
}

/** Silently refresh using the stored refresh token. Returns true on success. */
export async function refreshNestTokens(): Promise<boolean> {
  const refreshToken = getNestRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) { clearNestTokens(); return false; }
    const data = (await res.json()) as NestTokens;
    setNestTokens(data);
    return true;
  } catch {
    clearNestTokens();
    return false;
  }
}

/**
 * Exchange any valid Bearer token (Supabase or NestJS) for a fresh NestJS
 * access + refresh pair. Call this after a Supabase SIGNED_IN event.
 */
export async function exchangeForNestTokens(bearerToken: string): Promise<boolean> {
  try {
    const res = await fetch('/api/v1/auth/exchange', {
      method: 'POST',
      headers: { Authorization: `Bearer ${bearerToken}` },
    });
    if (!res.ok) return false;
    const data = (await res.json()) as NestTokens;
    setNestTokens(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the best available access token: NestJS token if valid, refreshed
 * NestJS token if expired, otherwise the provided Supabase fallback.
 */
export async function getBestToken(
  supabaseFallback: () => Promise<string | null>,
): Promise<string | null> {
  const nestToken = getNestAccessToken();
  if (nestToken) return nestToken;

  const refreshed = await refreshNestTokens();
  if (refreshed) {
    const after = getNestAccessToken();
    if (after) return after;
  }

  return supabaseFallback();
}
