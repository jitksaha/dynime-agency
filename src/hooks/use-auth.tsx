import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import {
  exchangeForNestTokens,
  clearNestTokens,
  getNestRefreshToken,
} from "@/lib/nestjs-tokens";

interface AuthContextType {
  user: User | null;
  session: Session | null;
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);

  const fetchRoleFromSupabase = async (userId: string) => {
    setRoleLoading(true);
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .limit(1)
        .single();
      setUserRole(data?.role ?? null);
    } catch {
      setUserRole(null);
    } finally {
      setRoleLoading(false);
    }
  };

  /** Exchange the current Supabase session token for NestJS tokens (fire-and-forget). */
  const ensureNestTokens = (accessToken: string) => {
    if (!getNestRefreshToken()) {
      exchangeForNestTokens(accessToken).catch(() => {});
    }
  };

  useEffect(() => {
    let cancelled = false;
    let roleFetchedForUserId: string | null = null;

    const { data: subData } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        roleFetchedForUserId = s.user.id;
        setRoleLoading(true);
        setTimeout(() => fetchRoleFromSupabase(s.user.id), 0);

        // On sign-in / token refresh: exchange Supabase JWT for NestJS tokens.
        if (
          event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED"
        ) {
          if (s.access_token) ensureNestTokens(s.access_token);

          // Mirror email changes into profiles for order auto-linking.
          setTimeout(() => {
            supabase.rpc("sync_my_profile_email").then(({ data, error }) => {
              if (!error && (data as any)?.relinked_orders > 0) {
                console.info("[auth] relinked orders:", (data as any).relinked_orders);
              }
            });
          }, 0);
        }

        if (event === "SIGNED_OUT") {
          clearNestTokens();
        }
      } else {
        setUserRole(null);
        setRoleLoading(false);
        clearNestTokens();
      }
      setLoading(false);
    });

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        if (data.session.user.id !== roleFetchedForUserId) {
          await fetchRoleFromSupabase(data.session.user.id);
        }
        // Exchange on startup if we don't already have NestJS tokens.
        if (data.session.access_token) ensureNestTokens(data.session.access_token);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
      subData.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
    // NestJS tokens obtained via the SIGNED_IN onAuthStateChange event above.
  };

  const signOut = async () => {
    // Revoke NestJS tokens before clearing Supabase session.
    const refreshToken = getNestRefreshToken();
    if (refreshToken) {
      try {
        const { data: s } = await supabase.auth.getSession();
        const tok = s.session?.access_token;
        if (tok) {
          await fetch("/api/v1/auth/logout", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${tok}`,
            },
            body: JSON.stringify({ refreshToken }),
          });
        }
      } catch {
        // Best-effort; proceed with sign-out regardless.
      }
    }
    clearNestTokens();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading: loading || roleLoading,
        userRole,
        isAdmin: !!userRole && ["super_admin","manager","editor","support","hr","sales"].includes(userRole),
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
