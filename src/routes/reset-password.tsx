import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/firmafloor-logo.png.asset.json";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha | FirmaFloor" },
      { name: "description", content: "Defina uma nova senha para sua conta FirmaFloor." },
      { property: "og:title", content: "Redefinir senha | FirmaFloor" },
      { property: "og:description", content: "Redefinição segura de senha da conta FirmaFloor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [message, setMessage] = useState("Validando o link...");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const hasRecovery = hash.get("type") === "recovery" || query.get("type") === "recovery";
    setRecovery(hasRecovery);
    setMessage(hasRecovery ? "" : "Abra esta página pelo link de recuperação enviado ao seu e-mail.");
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setMessage("As senhas não coincidem.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Senha atualizada com sucesso.");
    window.setTimeout(() => navigate({ to: "/" }), 900);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8">
        <img src={logoAsset.url} alt="FirmaFloor" className="h-12 w-auto" />
        <h1 className="mt-7 text-3xl font-black tracking-tight">Redefinir senha</h1>
        {recovery && (
          <form className="mt-6" onSubmit={submit}>
            <label className="block text-xs font-extrabold uppercase tracking-wide">Nova senha<input className="input mt-1.5" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></label>
            <label className="mt-4 block text-xs font-extrabold uppercase tracking-wide">Confirmar nova senha<input className="input mt-1.5" type="password" minLength={6} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" /></label>
            <button className="primary mt-6 w-full" disabled={busy}>{busy ? "Aguarde..." : "Salvar nova senha"}</button>
          </form>
        )}
        {message && <p className="mt-5 text-sm font-semibold text-primary" role="status">{message}</p>}
        <Link to="/auth" className="mt-6 block text-sm text-muted-foreground">← Voltar ao acesso</Link>
      </section>
    </main>
  );
}