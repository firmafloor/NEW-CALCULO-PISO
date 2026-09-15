import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import logoAsset from "@/assets/firmafloor-logo.png.asset.json";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil | FirmaFloor" },
      { name: "description", content: "Atualize seu perfil e suas preferências na FirmaFloor." },
      { property: "og:title", content: "Meu perfil | FirmaFloor" },
      { property: "og:description", content: "Perfil e preferências da conta FirmaFloor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, role, ready, refreshAccess } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [defaultWaste, setDefaultWaste] = useState("10");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDisplayName(profile?.displayName ?? "");
    setAvatarUrl(profile?.avatarUrl ?? "");
    const preferences = profile?.preferences;
    if (preferences && typeof preferences === "object" && "defaultWaste" in preferences) {
      setDefaultWaste(String(preferences.defaultWaste));
    }
  }, [profile]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setBusy(true);
    setMessage("");
    const waste = Number(defaultWaste);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        avatar_url: avatarUrl.trim() || null,
        preferences: { defaultWaste: Number.isFinite(waste) ? waste : 10 },
      })
      .eq("id", user.id);
    if (error) {
      setMessage("Não foi possível salvar o perfil.");
    } else {
      await refreshAccess();
      setMessage("Perfil atualizado.");
    }
    setBusy(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 sm:p-8">
        <Link to="/" aria-label="Voltar à calculadora"><img src={logoAsset.url} alt="FirmaFloor" className="h-12 w-auto" /></Link>
        <h1 className="mt-7 text-3xl font-black tracking-tight">Meu perfil</h1>
        {!ready ? (
          <p className="mt-5 text-sm text-muted-foreground">Carregando...</p>
        ) : !user ? (
          <div className="mt-5">
            <p className="text-sm text-muted-foreground">Entre para consultar e editar seu perfil.</p>
            <Link to="/auth" className="primary mt-4 inline-flex">Entrar</Link>
          </div>
        ) : (
          <form className="mt-6" onSubmit={submit}>
            <div className="flex items-center gap-4 rounded-xl bg-muted p-4">
              {avatarUrl ? <img src={avatarUrl} alt="Foto do perfil" className="h-14 w-14 rounded-full object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary font-black text-primary-foreground">{(displayName || user.email || "U").slice(0, 1).toUpperCase()}</div>}
              <div><p className="font-bold">{user.email}</p><p className="text-xs text-muted-foreground">{role === "admin" ? "Administrador" : "Operador"}</p></div>
            </div>
            <label className="mt-5 block text-xs font-extrabold uppercase tracking-wide">Nome<input className="input mt-1.5" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></label>
            <label className="mt-4 block text-xs font-extrabold uppercase tracking-wide">URL da foto<input className="input mt-1.5" type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." /></label>
            <label className="mt-4 block text-xs font-extrabold uppercase tracking-wide">Margem de perda preferida (%)<input className="input mt-1.5" type="number" min="0" max="60" step="0.5" value={defaultWaste} onChange={(e) => setDefaultWaste(e.target.value)} /></label>
            <button className="primary mt-6" disabled={busy}>{busy ? "Salvando..." : "Salvar perfil"}</button>
            {message && <p className="mt-3 text-sm font-semibold text-primary" role="status">{message}</p>}
          </form>
        )}
        <Link to="/" className="mt-6 block text-sm text-muted-foreground">← Voltar à calculadora</Link>
      </section>
    </main>
  );
}