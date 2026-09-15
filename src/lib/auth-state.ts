import { createContext, useContext, type Context } from "react";
import type { User } from "@supabase/supabase-js";

export type AccessRole = "admin" | "operador";

export type Profile = {
  displayName: string;
  avatarUrl: string | null;
  preferences: unknown;
};

export type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  role: AccessRole | null;
  ready: boolean;
  isAdmin: boolean;
  refreshAccess: (displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AUTH_CONTEXT_KEY = Symbol.for("firmafloor.auth-context");
const globalContexts = globalThis as typeof globalThis & {
  [AUTH_CONTEXT_KEY]?: Context<AuthContextValue | null>;
};

export const AuthContext =
  globalContexts[AUTH_CONTEXT_KEY] ??
  (globalContexts[AUTH_CONTEXT_KEY] = createContext<AuthContextValue | null>(null));

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}