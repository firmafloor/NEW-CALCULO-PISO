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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: role, error: initializeError } = await supabaseAdmin.rpc(
      "initialize_user_profile",
      {
        _user_id: context.userId,
        _email: email,
        _display_name: data.displayName || metadataDisplayName,
        _avatar_url: data.avatarUrl || "",
      },
    );
    if (initializeError) throw initializeError;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("display_name, avatar_url, preferences")
      .eq("id", context.userId)
      .single();
    if (profileError) throw profileError;

    return { role, profile };
  });