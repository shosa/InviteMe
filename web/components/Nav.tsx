"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck, Ticket } from "lucide-react";
import { Logo } from "./Logo";

type Me = { id: string; name: string; email: string; role: "user" | "admin" } | null;

// Barra superiore: accesso oppure account, e la console admin per gli amministratori.
export function Nav({ current }: { current?: "home" | "account" | "admin" }) {
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
        <a href="/" className="logo-link" aria-label="InviteMe, home"><Logo /></a>
        <nav className="nav-links" aria-label="Principale">
          <a href="/#modelli" className={current === "home" ? "is-current" : undefined}>Modelli</a>
          <a href="/#come-funziona">Come funziona</a>
          <a href="/#faq">Domande</a>
        </nav>
        <div className="nav-account">
          {me === undefined ? null : me ? (
            <>
              {me.role === "admin" && <a href="/admin" className={`nav-link${current === "admin" ? " is-current" : ""}`}><ShieldCheck size={16} aria-hidden="true" />Console</a>}
              <a href="/account" className={`nav-link${current === "account" ? " is-current" : ""}`}><Ticket size={16} aria-hidden="true" />I miei inviti</a>
              <button type="button" className="btn ghost small" onClick={logout}><LogOut size={16} aria-hidden="true" />Esci</button>
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
