import { useServerFn } from "@tanstack/react-start";
import type { User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { initializeProfile } from "@/lib/profile.functions";

export type AccessRole = "admin" | "operador";

type Profile = {
  displayName: string;
  avatarUrl: string | null;
  preferences: unknown;
};

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  role: AccessRole | null;
  ready: boolean;
  isAdmin: boolean;
  refreshAccess: (displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isInvalidCachedSession(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const status = "status" in error && typeof error.status === "number" ? error.status : 0;
  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  return (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    /invalid.*(jwt|token)|jwt.*(expired|invalid)|refresh.*token|session.*missing/i.test(message)
  );
}

async function clearInvalidCachedSession(error: unknown) {
  if (!isInvalidCachedSession(error)) return;
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
}

export function AuthProvider({
  queryClient,
  children,
}: {
  queryClient: QueryClient;
  children: ReactNode;
}) {
  const initialize = useServerFn(initializeProfile);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AccessRole | null>(null);
  const [ready, setReady] = useState(false);

  const loadAccess = useCallback(
    async (currentUser: User, displayName?: string) => {
      const result = await initialize({ data: { displayName } });
      setUser(currentUser);
      setRole(result.role);
      setProfile({
        displayName: result.profile.display_name,
        avatarUrl: result.profile.avatar_url,
        preferences: result.profile.preferences,
      });
    },
    [initialize],
  );

  const refreshAccess = useCallback(
    async (displayName?: string) => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        await clearInvalidCachedSession(error);
        setUser(null);
        setProfile(null);
        setRole(null);
        setReady(true);
        return;
      }
      await loadAccess(data.user, displayName);
      setReady(true);
    },
    [loadAccess],
  );

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data, error }) => {
      if (!active) return;
      if (error) await clearInvalidCachedSession(error);
      if (data.user) {
        try {
          await loadAccess(data.user);
        } catch (error) {
          console.error("Não foi possível carregar o perfil.", error);
          setUser(data.user);
        }
      }
      if (active) setReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      if (event === "SIGNED_OUT" || !session?.user) {
        setUser(null);
        setProfile(null);
        setRole(null);
        queryClient.clear();
        setReady(true);
        return;
      }
      window.setTimeout(() => {
        loadAccess(session.user).catch((error) =>
          console.error("Não foi possível atualizar o perfil.", error),
        );
      }, 0);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadAccess, queryClient]);

  const signOut = useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRole(null);
  }, [queryClient]);

  const value = useMemo(
    () => ({ user, profile, role, ready, isAdmin: role === "admin", refreshAccess, signOut }),
    [user, profile, role, ready, refreshAccess, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}