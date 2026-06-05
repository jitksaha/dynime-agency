/**
 * NestJS token store — persists access + refresh tokens in localStorage.
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

let activeRefreshPromise: Promise<boolean> | null = null;

/** Silently refresh using the stored refresh token. Returns true on success. */
export async function refreshNestTokens(): Promise<boolean> {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
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
  })();

  activeRefreshPromise.finally(() => {
    activeRefreshPromise = null;
  });

  return activeRefreshPromise;
}
