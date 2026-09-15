import { createClient, type User } from "@supabase/supabase-js";
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import type { Database } from "@/integrations/supabase/types";

type AuthClaims = {
  sub: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

type JwtPayload = {
  sub?: unknown;
  exp?: unknown;
};

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const encodedPayload = token.split(".")[1];
    if (!encodedPayload) return null;

    const normalized = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(atob(normalized + padding)) as JwtPayload;
  } catch {
    return null;
  }
}

function claimsFromUser(user: User): AuthClaims {
  return {
    sub: user.id,
    ...(user.email ? { email: user.email } : {}),
    user_metadata: user.user_metadata,
  };
}

export const requireProjectAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const supabaseUrl =
      process.env["SUPABASE_URL"] ||
      process.env["VITE_SUPABASE_URL"] ||
      "https://apqvgtmzjkcmouxumrrm.supabase.co";
    const supabasePublishableKey =
      process.env["SUPABASE_PUBLISHABLE_KEY"] ||
      process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
      process.env["VITE_SUPABASE_ANON_KEY"] ||
      "sb_publishable_MLqofJDnNE9HCi6QSzQCyg_23Npd1Ly";
    const request = getRequest();
    const authHeader = request?.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Unauthorized: No valid authorization header provided");
    }

    const token = authHeader.slice("Bearer ".length);
    if (token.split(".").length !== 3) {
      throw new Error("Unauthorized: Invalid token");
    }

    const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
      global: {
        fetch: createSupabaseFetch(supabasePublishableKey),
        headers: { Authorization: `Bearer ${token}` },
      },
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    let claims: AuthClaims | null = null;

    try {
      const { data, error } = await supabase.auth.getClaims(token);
      const candidate = data?.claims;
      if (!error && candidate && typeof candidate.sub === "string") {
        claims = candidate as AuthClaims;
      }
    } catch {
      claims = null;
    }

    if (!claims) {
      try {
        const { data, error } = await supabase.auth.getUser(token);
        if (!error && data.user) claims = claimsFromUser(data.user);
      } catch {
        claims = null;
      }
    }

    if (!claims) {
      const payload = decodeJwtPayload(token);
      const now = Date.now() / 1000;
      if (!payload || typeof payload.sub !== "string") {
        throw new Error("Unauthorized: Invalid token");
      }
      if (typeof payload.exp !== "number" || payload.exp <= now) {
        throw new Error("Unauthorized: Expired token");
      }

      // A decoded payload is not cryptographic proof of identity. Reject it
      // when both server-backed validation methods fail.
      throw new Error("Unauthorized: Invalid token");
    }

    return next({
      context: {
        supabase,
        userId: claims.sub,
        claims,
      },
    });
  },
);