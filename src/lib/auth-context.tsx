import { useServerFn } from "@tanstack/react-start";
import type { User } from "@supabase/supabase-js";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { QueryClient } from "@tanstack/react-query";
import { db as supabase } from "@/lib/db";
import { initializeProfile } from "@/lib/profile.functions";
import { AuthContext, type AccessRole, type Profile } from "@/lib/auth-state";

const ACCESS_CACHE_KEY = "firmafloor.access.v1";
const ADMIN_EMAILS = new Set(["firmafloor@gmail.com", "financeirofirmafloor@gmail.com"]);

type AccessCache = {
  version: 1;
  userId: string;
  role: AccessRole;
  profile: Profile;
};

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

function defaultProfile(currentUser: User): Profile {
  const metadataName = currentUser.user_metadata?.["display_name"];
  return {
    displayName:
      typeof metadataName === "string" && metadataName.trim()
        ? metadataName.trim()
        : normalizeEmail(currentUser.email).split("@")[0] || "Usuário",
    avatarUrl:
      typeof currentUser.user_metadata?.["avatar_url"] === "string"
        ? currentUser.user_metadata["avatar_url"]
        : null,
    preferences: {},
  };
}

function readAccessCache(userId: string): AccessCache | null {
  try {
    const raw = window.localStorage.getItem(ACCESS_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as Partial<AccessCache>;
    if (
      cached.version !== 1 ||
      cached.userId !== userId ||
      (cached.role !== "admin" && cached.role !== "operador") ||
      !cached.profile
    ) {
      return null;
    }
    return cached as AccessCache;
  } catch {
    return null;
  }
}

function writeAccessCache(userId: string, role: AccessRole, profile: Profile) {
  try {
    window.localStorage.setItem(
      ACCESS_CACHE_KEY,
      JSON.stringify({ version: 1, userId, role, profile } satisfies AccessCache),
    );
  } catch {
    // Storage can be unavailable in private browsing; the live session still works.
  }
}

function clearAccessCache() {
  try {
    window.localStorage.removeItem(ACCESS_CACHE_KEY);
  } catch {
    // Nothing else is required when browser storage is unavailable.
  }
}

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

  const applyAccess = useCallback(
    (currentUser: User, nextRole: AccessRole, nextProfile: Profile) => {
      const effectiveRole =
        ADMIN_EMAILS.has(normalizeEmail(currentUser.email)) || nextRole === "admin"
          ? "admin"
          : "operador";
      setUser(currentUser);
      setRole(effectiveRole);
      setProfile(nextProfile);
      writeAccessCache(currentUser.id, effectiveRole, nextProfile);
    },
    [],
  );

  const loadAccessFromClient = useCallback(
    async (currentUser: User): Promise<boolean> => {
      const [profileResult, roleResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name, avatar_url, preferences")
          .eq("id", currentUser.id)
          .maybeSingle(),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", currentUser.id)
          .maybeSingle(),
      ]);

      const cached = readAccessCache(currentUser.id);
      const databaseRole = roleResult.data?.role;
      const recoveredRole: AccessRole =
        ADMIN_EMAILS.has(normalizeEmail(currentUser.email)) || databaseRole === "admin"
          ? "admin"
          : databaseRole === "operador"
            ? "operador"
            : cached?.role ?? "operador";
      const recoveredProfile: Profile = profileResult.data
        ? {
            displayName: profileResult.data.display_name,
            avatarUrl: profileResult.data.avatar_url,
            preferences: profileResult.data.preferences,
          }
        : cached?.profile ?? defaultProfile(currentUser);

      if (profileResult.error || roleResult.error) {
        console.warn("Perfil recuperado parcialmente pela sessão local.", {
          profile: profileResult.error?.message,
          role: roleResult.error?.message,
        });
      }
      applyAccess(currentUser, recoveredRole, recoveredProfile);
      return Boolean(profileResult.data || roleResult.data || cached || recoveredRole === "admin");
    },
    [applyAccess],
  );

  const loadAccess = useCallback(
    async (currentUser: User, displayName?: string) => {
      try {
        const result = await initialize({ data: { displayName } });
        applyAccess(currentUser, result.role, {
          displayName: result.profile.display_name,
          avatarUrl: result.profile.avatar_url,
          preferences: result.profile.preferences,
        });
      } catch (error) {
        console.warn("Inicialização remota indisponível; recuperando acesso pela sessão.", error);
        await loadAccessFromClient(currentUser);
      }
    },
    [applyAccess, initialize, loadAccessFromClient],
  );

  const refreshAccess = useCallback(
    async (displayName?: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData.session?.user;
      if (sessionUser) {
        const cached = readAccessCache(sessionUser.id);
        if (cached) applyAccess(sessionUser, cached.role, cached.profile);
      }

      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        await clearInvalidCachedSession(error);
        if (isInvalidCachedSession(error) || !sessionUser) {
          setUser(null);
          setProfile(null);
          setRole(null);
          clearAccessCache();
        }
        setReady(true);
        return;
      }
      await loadAccess(data.user, displayName);
      setReady(true);
    },
    [applyAccess, loadAccess],
  );

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data: sessionData }) => {
      if (!active) return;
      const sessionUser = sessionData.session?.user;
      if (sessionUser) {
        const cached = readAccessCache(sessionUser.id);
        if (cached) applyAccess(sessionUser, cached.role, cached.profile);
        else setUser(sessionUser);
      }

      const { data, error } = await supabase.auth.getUser();
      if (!active) return;
      if (error) await clearInvalidCachedSession(error);
      if (data.user) {
        await loadAccess(data.user);
      } else if (isInvalidCachedSession(error) || !sessionUser) {
        clearAccessCache();
        setUser(null);
        setProfile(null);
        setRole(null);
      }
      if (active) setReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      if (event === "SIGNED_OUT" || !session?.user) {
        setUser(null);
        setProfile(null);
        setRole(null);
        clearAccessCache();
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
  }, [applyAccess, loadAccess, queryClient]);

  const signOut = useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    clearAccessCache();
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