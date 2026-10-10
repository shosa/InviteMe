"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "register" | "forgot";

// Accesso, registrazione e recupero password in un solo componente.
export function AuthForm({ initialMode, next }: { initialMode: Mode; next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "forgot") {
        await fetch("/api/auth/forgot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email }),
        });
        setNotice("Se l'email è registrata, riceverai a breve il link per reimpostare la password.");
        return;
      }
      const url = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Operazione non riuscita");
      router.push(next.startsWith("/") ? next : "/account");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto");
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "login" ? "Bentornato" : mode === "register" ? "Crea il tuo account" : "Recupera la password";

  return (
    <div className="auth">
      <div className="auth-tabs" role="tablist">
        <button role="tab" aria-selected={mode === "login"} className={mode === "login" ? "is-on" : ""} onClick={() => setMode("login")}>Accedi</button>
        <button role="tab" aria-selected={mode === "register"} className={mode === "register" ? "is-on" : ""} onClick={() => setMode("register")}>Registrati</button>
      </div>
      <h1>{title}</h1>
      <form onSubmit={submit} className="auth-form">
        {mode === "register" && (
          <label className="field">
            <span>Nome</span>
            <input value={form.name} onChange={set("name")} autoComplete="name" required maxLength={80} />
          </label>
        )}
        <label className="field">
          <span>Email</span>
          <input type="email" value={form.email} onChange={set("email")} autoComplete="email" required />
        </label>
        {mode !== "forgot" && (
          <label className="field">
            <span>Password {mode === "register" && <em>(almeno 8 caratteri)</em>}</span>
            <input
              type="password"
              value={form.password}
              onChange={set("password")}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              required
              minLength={mode === "register" ? 8 : undefined}
            />
          </label>
        )}
        {error && <p role="alert" className="form-error">{error}</p>}
        {notice && <p role="status" className="form-notice">{notice}</p>}
        <button type="submit" className="btn solid wide" disabled={busy}>
          {busy ? "Attendere…" : mode === "login" ? "Accedi" : mode === "register" ? "Crea account" : "Invia il link"}
        </button>
      </form>
      <div className="auth-foot">
        {mode === "login" && <button type="button" className="link" onClick={() => setMode("forgot")}>Password dimenticata?</button>}
        {mode === "forgot" && <button type="button" className="link" onClick={() => setMode("login")}>Torna all&apos;accesso</button>}
      </div>
    </div>
  );
}
