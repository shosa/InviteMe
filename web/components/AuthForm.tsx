"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ui, type Lang } from "@/lib/ui";

type Mode = "login" | "register" | "forgot";

// Accesso, registrazione e recupero password in un solo componente.
export function AuthForm({ initialMode, next, google = false, googleError = false, lang = "it" }: { initialMode: Mode; next: string; google?: boolean; googleError?: boolean; lang?: Lang }) {
  const router = useRouter();
  const L = ui(lang).auth;
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
        setNotice(L.forgotNotice);
        return;
      }
      const url = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? L.genericError);
      router.push(next.startsWith("/") ? next : "/account");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : L.unexpected);
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "login" ? L.welcomeBack : mode === "register" ? L.createAccount : L.recoverTitle;

  return (
    <div className="auth">
      <div className="auth-tabs" role="tablist">
        <button role="tab" aria-selected={mode === "login"} className={mode === "login" ? "is-on" : ""} onClick={() => setMode("login")}>{L.login}</button>
        <button role="tab" aria-selected={mode === "register"} className={mode === "register" ? "is-on" : ""} onClick={() => setMode("register")}>{L.register}</button>
      </div>
      <h1>{title}</h1>
      {google && (
        <>
          <a className="btn outline wide google-btn" href={`/api/auth/google?next=${encodeURIComponent(next)}`}>
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6C12.3 13.5 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7-10 7-17.5z"/><path fill="#FBBC05" d="M10.4 28.8c-.5-1.4-.8-3-.8-4.8s.3-3.3.8-4.8l-7.8-6C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.8-6z"/><path fill="#34A853" d="M24 48c6.5 0 12-2.1 16-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.7-4.2-13.6-9.8l-7.8 6C6.5 42.6 14.6 48 24 48z"/></svg>
            {L.continueGoogle}
          </a>
          <div className="or" aria-hidden="true"><span>{L.or}</span></div>
        </>
      )}
      {googleError && <p role="alert" className="form-error">{L.googleError}</p>}
      <form onSubmit={submit} className="auth-form">
        {mode === "register" && (
          <label className="field">
            <span>{L.name}</span>
            <input value={form.name} onChange={set("name")} autoComplete="name" required maxLength={80} />
          </label>
        )}
        <label className="field">
          <span>{L.email}</span>
          <input type="email" value={form.email} onChange={set("email")} autoComplete="email" required />
        </label>
        {mode !== "forgot" && (
          <label className="field">
            <span>{L.password} {mode === "register" && <em>{L.minChars}</em>}</span>
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
          {busy ? L.busy : mode === "login" ? L.login : mode === "register" ? L.createBtn : L.sendLink}
        </button>
      </form>
      <div className="auth-foot">
        {mode === "login" && <button type="button" className="link" onClick={() => setMode("forgot")}>{L.forgot}</button>}
        {mode === "forgot" && <button type="button" className="link" onClick={() => setMode("login")}>{L.backToLogin}</button>}
      </div>
    </div>
  );
}
