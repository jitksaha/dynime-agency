import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import {
  setNestTokens,
  clearNestTokens,
  getNestAccessToken,
  getNestRefreshToken,
  refreshNestTokens,
} from "@/lib/nestjs-tokens";

export interface AppUser {
  id: string;
  email: string | null;
  roles: string[];
  user_metadata?: { full_name?: string; avatar_url?: string; [key: string]: unknown };
}

interface AuthContextType {
  user: AppUser | null;
  session: { access_token: string } | null;
  loading: boolean;
  userRole: string | null;
  isAdmin: boolean;
  isMock: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  userRole: null,
  isAdmin: false,
  isMock: false,
  signIn: async () => ({ error: "Auth not ready" }),
  signOut: async () => {},
});

function decodeJwtPayload(token: string): { sub: string; email?: string | null; roles?: string[] } | null {
  try {
    const [, payload] = token.split('.');
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded;
  } catch {
    return null;
  }
}

async function fetchProfile(token: string): Promise<{ full_name?: string | null; avatar_url?: string | null } | null> {
  try {
    const res = await fetch('/api/v1/auth/profile', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrateUser = useCallback(async (token: string) => {
    const payload = decodeJwtPayload(token);
    if (!payload?.sub) return;
    const profile = await fetchProfile(token);
    setUser({
      id: payload.sub,
      email: payload.email ?? null,
      roles: payload.roles ?? [],
      user_metadata: {
        full_name: profile?.full_name ?? undefined,
        avatar_url: profile?.avatar_url ?? undefined,
      },
    });
  }, []);

  useEffect(() => {
    (async () => {
      let token = getNestAccessToken();
      if (!token) {
        const ok = await refreshNestTokens();
        if (ok) token = getNestAccessToken();
      }
      if (token) {
        await hydrateUser(token);
      }
      setLoading(false);
    })();
  }, [hydrateUser]);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { message?: string };
        return { error: err.message ?? 'Invalid email or password' };
      }
      const data = await res.json() as { accessToken: string; refreshToken: string; expiresIn: number };
      setNestTokens(data);
      await hydrateUser(data.accessToken);
      return { error: null };
    } catch {
      return { error: 'Network error — please try again' };
    }
  };

  const signOut = async () => {
    const refreshToken = getNestRefreshToken();
    const token = getNestAccessToken();
    if (token) {
      try {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ refreshToken }),
        });
      } catch { /* best-effort */ }
    }
    clearNestTokens();
    setUser(null);
  };

  const userRole = user?.roles?.[0] ?? null;
  const currentToken = getNestAccessToken();

  return (
    <AuthContext.Provider
      value={{
        user,
        session: user ? { access_token: currentToken ?? '' } : null,
        loading,
        userRole,
        isAdmin: !!userRole && ["super_admin", "manager", "editor", "support", "hr", "sales"].includes(userRole),
        isMock: false,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
