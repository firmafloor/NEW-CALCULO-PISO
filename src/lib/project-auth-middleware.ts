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
  iss?: unknown;
};

type SupabaseConnection = {
  url: string;
  key: string;
};

const FALLBACK_SUPABASE_URL = "https://apqvgtmzjkcmouxumrrm.supabase.co";
const FALLBACK_SUPABASE_KEY = "sb_publishable_MLqofJDnNE9HCi6QSzQCyg_23Npd1Ly";

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

function projectUrlFromIssuer(issuer: unknown): string | null {
  if (typeof issuer !== "string") return null;

  try {
    const url = new URL(issuer);
    if (url.protocol !== "https:" || url.pathname !== "/auth/v1") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function authConnections(payload: JwtPayload): SupabaseConnection[] {
  const configuredUrl = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
  const configuredKey =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["VITE_SUPABASE_ANON_KEY"];
  const connections: SupabaseConnection[] = [];
  const issuerUrl = projectUrlFromIssuer(payload.iss);

  if (configuredUrl && configuredKey) connections.push({ url: configuredUrl, key: configuredKey });
  connections.push({ url: FALLBACK_SUPABASE_URL, key: FALLBACK_SUPABASE_KEY });

  const unique = connections.filter(
    (connection, index, all) =>
      all.findIndex((candidate) => candidate.url === connection.url && candidate.key === connection.key) ===
      index,
  );

  // Prefer the project that issued the token, but only when it is one of the
  // explicitly configured projects. The issuer is never trusted by itself.
  return unique.sort((left, right) => {
    if (left.url === issuerUrl) return -1;
    if (right.url === issuerUrl) return 1;
    return 0;
  });
}

function createAuthenticatedClient(connection: SupabaseConnection, token: string) {
  return createClient<Database>(connection.url, connection.key, {
    global: {
      fetch: createSupabaseFetch(connection.key),
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function isDefinitiveAuthError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const status = "status" in error && typeof error.status === "number" ? error.status : 0;
  return status === 401 || status === 403;
}

async function waitForRetry(attempt: number) {
  await new Promise((resolve) => setTimeout(resolve, 150 * attempt));
}

export const requireProjectAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();
    const authHeader = request?.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Unauthorized: No valid authorization header provided");
    }

    const token = authHeader.slice("Bearer ".length);
    const payload = decodeJwtPayload(token);
    if (token.split(".").length !== 3 || !payload || typeof payload.sub !== "string") {
      throw new Error("Unauthorized: Invalid token");
    }
    if (typeof payload.exp !== "number" || payload.exp <= Date.now() / 1000) {
      throw new Error("Unauthorized: Expired token");
    }

    let claims: AuthClaims | null = null;
    let supabase: ReturnType<typeof createAuthenticatedClient> | null = null;
    let receivedDefinitiveRejection = false;

    for (const connection of authConnections(payload)) {
      const candidateClient = createAuthenticatedClient(connection, token);

      try {
        const { data, error } = await candidateClient.auth.getClaims(token);
        const candidate = data?.claims;
        if (!error && candidate && typeof candidate.sub === "string") {
          claims = candidate as AuthClaims;
          supabase = candidateClient;
          break;
        }
        receivedDefinitiveRejection ||= isDefinitiveAuthError(error);
      } catch (error) {
        receivedDefinitiveRejection ||= isDefinitiveAuthError(error);
      }

      for (let attempt = 1; !claims && attempt <= 2; attempt += 1) {
        try {
          const { data, error } = await candidateClient.auth.getUser(token);
          if (!error && data.user) {
            claims = claimsFromUser(data.user);
            supabase = candidateClient;
            break;
          }
          receivedDefinitiveRejection ||= isDefinitiveAuthError(error);
          if (isDefinitiveAuthError(error)) break;
        } catch (error) {
          receivedDefinitiveRejection ||= isDefinitiveAuthError(error);
          if (isDefinitiveAuthError(error)) break;
        }

        if (attempt < 2) await waitForRetry(attempt);
      }

      if (claims) break;
    }

    if (!claims || !supabase) {
      throw new Error(
        receivedDefinitiveRejection
          ? "Unauthorized: Invalid token"
          : "Authentication service temporarily unavailable",
      );
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