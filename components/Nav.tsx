"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Me = { id: string; name: string; email: string } | null;

// Barra superiore: mostra Accedi oppure il proprio account, in base alla sessione.
export function Nav({ current }: { current?: "home" | "account" }) {
  const router = useRouter();
  const [me, setMe] = useState<Me | undefined>(undefined);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { user: Me }) => setMe(d.user))
      .catch(() => setMe(null));
  }, []);

  async function logout() {
    await fetch("/api/auth/me", { method: "DELETE" });
    setMe(null);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="nav">
      <div className="nav-inner">
        <a href="/" className="logo" aria-label="InviteMe, home">
          <span className="logo-mark">IM</span>
          <span className="logo-word">InviteMe</span>
        </a>
        <nav className="nav-links" aria-label="Principale">
          <a href="/#modelli" className={current === "home" ? "is-current" : undefined}>Modelli</a>
          <a href="/#come-funziona">Come funziona</a>
          <a href="/#prezzi">Prezzi</a>
          <a href="/#faq">Domande</a>
        </nav>
        <div className="nav-account">
          {me === undefined ? null : me ? (
            <>
              <a href="/account" className={`nav-user${current === "account" ? " is-current" : ""}`}>I miei inviti</a>
              <button type="button" className="btn ghost small" onClick={logout}>Esci</button>
            </>
          ) : (
            <>
              <a href="/accedi" className="btn ghost small">Accedi</a>
              <a href="/accedi?tab=register" className="btn solid small">Crea account</a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
