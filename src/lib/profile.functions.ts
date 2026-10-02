import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireProjectAuth } from "@/lib/project-auth-middleware";

export const initializeProfile = createServerFn({ method: "POST" })
  .middleware([requireProjectAuth])
  .inputValidator((data) =>
    z
      .object({
        displayName: z.string().trim().max(120).optional(),
        avatarUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const email = typeof context.claims.email === "string" ? context.claims.email : "";
    const userMetadata =
      context.claims.user_metadata && typeof context.claims.user_metadata === "object"
        ? context.claims.user_metadata
        : {};
    const metadataDisplayName =
      "display_name" in userMetadata && typeof userMetadata["display_name"] === "string"
        ? userMetadata["display_name"]
        : "";

    const displayName = data.displayName || metadataDisplayName;
    const avatarUrl = data.avatarUrl || "";
    const { data: authenticatedRole, error: authenticatedInitializeError } =
      await (context.supabase as unknown as import("@supabase/supabase-js").SupabaseClient<any>).rpc(
      "initialize_user_profile",
      {
        _user_id: context.userId,
        _email: email,
        _display_name: displayName,
        _avatar_url: avatarUrl,
      },
    );

    if (!authenticatedInitializeError) {
      const { data: profile, error: profileError } = await (context.supabase as unknown as import("@supabase/supabase-js").SupabaseClient<any>)
        .from("profiles")
        .select("display_name, avatar_url, preferences")
        .eq("id", context.userId)
        .single();
      if (!profileError && profile) return { role: authenticatedRole, profile };
    }

    const { supabaseAdmin: typedAdmin } = await import("@/integrations/supabase/client.server");
    const supabaseAdmin = typedAdmin as unknown as import("@supabase/supabase-js").SupabaseClient<any>;
    const { data: role, error: initializeError } = await supabaseAdmin.rpc(
      "initialize_user_profile",
      {
        _user_id: context.userId,
        _email: email,
        _display_name: displayName,
        _avatar_url: avatarUrl,
      },
    );
    if (initializeError) throw authenticatedInitializeError || initializeError;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("display_name, avatar_url, preferences")
      .eq("id", context.userId)
      .single();
    if (profileError) throw profileError;

    return { role, profile };
  });