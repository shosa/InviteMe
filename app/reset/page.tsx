"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Nav } from "@/components/Nav";

// Imposta una nuova password a partire dal link ricevuto via email.
function ResetForm() {
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
      setError(data.error ?? "Operazione non riuscita");
      setBusy(false);
      return;
    }
    router.push("/account");
    router.refresh();
  }

  if (!token) return <p className="form-error">Link non valido. Richiedine uno nuovo dalla pagina di accesso.</p>;

  return (
    <form onSubmit={submit} className="auth-form">
      <label className="field">
        <span>Nuova password <em>(almeno 8 caratteri)</em></span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required autoComplete="new-password" />
      </label>
      {error && <p role="alert" className="form-error">{error}</p>}
      <button type="submit" className="btn solid wide" disabled={busy}>{busy ? "Salvataggio…" : "Salva la nuova password"}</button>
    </form>
  );
}

export default function Reset() {
  return (
    <>
      <Nav />
      <main className="auth-page">
        <div className="auth-card">
          <h1>Nuova password</h1>
          <Suspense fallback={null}>
            <ResetForm />
          </Suspense>
        </div>
      </main>
    </>
  );
}
