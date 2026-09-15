import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const initializeProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        displayName: z.string().trim().max(120).optional(),
        avatarUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { data: authData, error: authError } = await context.supabase.auth.getUser();
    if (authError || !authData.user) throw new Error("Não foi possível validar sua conta.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: role, error: initializeError } = await supabaseAdmin.rpc(
      "initialize_user_profile",
      {
        _user_id: context.userId,
        _email: authData.user.email ?? "",
        _display_name:
          data.displayName || String(authData.user.user_metadata?.["display_name"] ?? ""),
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