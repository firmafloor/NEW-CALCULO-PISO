import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import logoAsset from "@/assets/firmafloor-logo.png.asset.json";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acesso à Calculadora | FirmaFloor" },
      { name: "description", content: "Entre ou crie sua conta para administrar o catálogo FirmaFloor." },
      { property: "og:title", content: "Acesso à Calculadora | FirmaFloor" },
      { property: "og:description", content: "Acesso seguro à calculadora e ao catálogo FirmaFloor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Mode = "login" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const { user, refreshAccess } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setMessage("Enviamos as instruções de redefinição para o seu e-mail.");
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name.trim() },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setMessage("Cadastro recebido. Confirme seu e-mail para concluir o acesso.");
        } else {
          await refreshAccess(name.trim());
          await navigate({ to: "/" });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await refreshAccess();
        await navigate({ to: "/" });
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível concluir. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8">
        <Link to="/" aria-label="Voltar à calculadora">
          <img src={logoAsset.url} alt="FirmaFloor" className="h-12 w-auto" />
        </Link>
        <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.18em] text-primary">Acesso seguro</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          {mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Recuperar senha"}
        </h1>

        {user ? (
          <div className="mt-6">
            <p className="text-sm text-muted-foreground">Você já está conectado.</p>
            <Link to="/" className="primary mt-4 inline-flex">Ir para a calculadora</Link>
          </div>
        ) : (
          <form className="mt-6" onSubmit={submit}>
            {mode === "signup" && (
              <Field label="Nome">
                <input className="input" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </Field>
            )}
            <Field label="E-mail">
              <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </Field>
            {mode !== "forgot" && (
              <Field label="Senha">
                <input className="input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
              </Field>
            )}
            <button className="primary mt-6 w-full" type="submit" disabled={busy}>
              {busy ? "Aguarde..." : mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar instruções"}
            </button>
            {message && <p className="mt-4 text-sm font-semibold text-primary" role="status">{message}</p>}
          </form>
        )}

        {!user && (
          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-primary">
            {mode !== "login" && <button type="button" onClick={() => { setMode("login"); setMessage(""); }}>Entrar</button>}
            {mode !== "signup" && <button type="button" onClick={() => { setMode("signup"); setMessage(""); }}>Criar conta</button>}
            {mode !== "forgot" && <button type="button" onClick={() => { setMode("forgot"); setMessage(""); }}>Esqueci minha senha</button>}
          </div>
        )}
        <Link to="/" className="mt-6 block text-sm text-muted-foreground">← Continuar como operador</Link>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="mt-4 block text-xs font-extrabold uppercase tracking-wide">{label}<span className="mt-1.5 block">{children}</span></label>;
}