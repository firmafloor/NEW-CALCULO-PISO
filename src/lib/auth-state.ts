import { createContext, useContext } from "react";
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

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}