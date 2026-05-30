import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

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

  useEffect(() => {
    let cancelled = false;
    // Track the userId that onAuthStateChange already started fetching a role
    // for, so the getSession fallback IIFE doesn't fire a duplicate fetch.
    let roleFetchedForUserId: string | null = null;

    const { data: subData } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        roleFetchedForUserId = s.user.id;
        setRoleLoading(true);
        setTimeout(() => fetchRoleFromSupabase(s.user.id), 0);
        // When the user's verified email changes, mirror it into profiles
        // so order auto-linking uses the new address.
        if (event === "USER_UPDATED" || event === "SIGNED_IN") {
          setTimeout(() => {
            supabase.rpc("sync_my_profile_email").then(({ data, error }) => {
              if (!error && (data as any)?.relinked_orders > 0) {
                // Soft notify via console; UI-level toast handled by caller pages.
                console.info("[auth] relinked orders:", (data as any).relinked_orders);
              }
            });
          }, 0);
        }
      } else {
        setUserRole(null);
        setRoleLoading(false);
      }
      setLoading(false);
    });

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      // Only fetch the role here if onAuthStateChange hasn't already started
      // fetching it for this user (avoids two concurrent DB reads on startup).
      if (data.session?.user && data.session.user.id !== roleFetchedForUserId) {
        await fetchRoleFromSupabase(data.session.user.id);
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
  };

  const signOut = async () => {
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
