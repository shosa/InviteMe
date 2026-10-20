"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Nav } from "@/components/Nav";
import { ui, type Lang } from "@/lib/ui";

// Imposta una nuova password a partire dal link ricevuto via email.
function ResetForm({ lang }: { lang: Lang }) {
  const L = ui(lang).reset;
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? ui(lang).auth.genericError);
      setBusy(false);
      return;
    }
    router.push("/account");
    router.refresh();
  }

  if (!token) return <p className="form-error">{L.invalid}</p>;

  return (
    <form onSubmit={submit} className="auth-form">
      <label className="field">
        <span>{L.newPassword} <em>{L.minChars}</em></span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required autoComplete="new-password" />
      </label>
      {error && <p role="alert" className="form-error">{error}</p>}
      <button type="submit" className="btn solid wide" disabled={busy}>{busy ? L.saving : L.save}</button>
    </form>
  );
}

export function ResetPage({ lang }: { lang: Lang }) {
  const L = ui(lang).reset;
  return (
    <>
      <Nav lang={lang} />
      <main className="auth-page">
        <div className="auth-card">
          <h1>{L.title}</h1>
          <Suspense fallback={null}>
            <ResetForm lang={lang} />
          </Suspense>
        </div>
      </main>
    </>
  );
}
