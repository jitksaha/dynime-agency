import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authApi, tokenStorage, type AdminUser } from "@/lib/api";

export interface AppUser {
  id: string;
  email: string | null;
  name: string;
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

const toAppUser = (u: any): AppUser => {
  const roles = Array.isArray(u.roles) ? u.roles : (u.role ? [u.role] : []);
  const name = u.name || u.email?.split('@')[0] || "Admin";
  return {
    id: String(u.id),
    email: u.email,
    name,
    roles,
    user_metadata: { full_name: name },
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount — restore session from stored token
  useEffect(() => {
    const token = tokenStorage.get();
    if (!token) {
      setLoading(false);
      return;
    }
    authApi.me()
      .then((res) => setUser(toAppUser(res.data)))
      .catch(() => tokenStorage.remove())
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const res = await authApi.login(email, password);
      tokenStorage.set((res.data as any).accessToken || res.data.token);
      setUser(toAppUser(res.data.user));
      return { error: null };
    } catch (err: any) {
      const msg = err?.response?.data?.errors?.email?.[0]
        ?? err?.response?.data?.message
        ?? "Invalid email or password";
      return { error: msg };
    }
  };

  const signOut = async () => {
    try { await authApi.logout(); } catch { /* best-effort */ }
    tokenStorage.remove();
    setUser(null);
  };

  const token = tokenStorage.get();
  const userRole = user?.roles?.[0] ?? null;

  return (
    <AuthContext.Provider
      value={{
        user,
        session: user ? { access_token: token ?? "" } : null,
        loading,
        userRole,
        isAdmin: !!userRole && ["super_admin", "admin", "manager", "editor"].includes(userRole),
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
