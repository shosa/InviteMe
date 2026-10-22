"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleHelp, ListOrdered, LayoutGrid, LogIn, LogOut, Menu, ShieldCheck, Ticket, UserPlus, X } from "lucide-react";
import { Logo } from "./Logo";
import { ui, type Lang } from "@/lib/ui";
import { LangSelect } from "@/components/LangSelect";

type Me = { id: string; name: string; email: string; role: "user" | "admin" } | null;

// Barra superiore: accesso oppure account, e la console admin per gli amministratori.
export function Nav({ current, lang = "it" }: { current?: "home" | "account" | "admin"; lang?: Lang }) {
  const t = ui(lang);
  const router = useRouter();
  const [me, setMe] = useState<Me | undefined>(undefined);
  // Su telefono la navigazione si apre con l'hamburger, sotto la barra, in una colonna.
  const [open, setOpen] = useState(false);

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
    <header className={`nav${open ? " is-open" : ""}`}>
      <div className="nav-inner">
        <a href="/" className="logo-link" aria-label="InviteMe, home"><Logo /></a>
        <nav id="nav-menu" className="nav-links" aria-label="Principale">
          <a href="/#modelli" className={current === "home" ? "is-current" : undefined} onClick={() => setOpen(false)}><LayoutGrid size={16} aria-hidden="true" />{t.modelli}</a>
          <a href="/#come-funziona" onClick={() => setOpen(false)}><ListOrdered size={16} aria-hidden="true" />{t.howItWorks}</a>
          <a href="/#faq" onClick={() => setOpen(false)}><CircleHelp size={16} aria-hidden="true" />{t.faq}</a>
        </nav>
        <div className="nav-account">
          {me === undefined ? null : me ? (
            <>
              {me.role === "admin" && <a href="/admin" className={`nav-link${current === "admin" ? " is-current" : ""}`}><ShieldCheck size={16} aria-hidden="true" />{t.console}</a>}
              <a href="/account" className={`nav-link${current === "account" ? " is-current" : ""}`}><Ticket size={16} aria-hidden="true" />{t.myInvites}</a>
              <button type="button" className="btn ghost small" onClick={logout}><LogOut size={16} aria-hidden="true" />{t.logout}</button>
            </>
          ) : (
            <>
              <a href="/accedi" className="btn ghost small"><LogIn size={16} aria-hidden="true" />{t.login}</a>
              <a href="/accedi?tab=register" className="btn solid small"><UserPlus size={16} aria-hidden="true" />{t.register}</a>
            </>
          )}
          <LangSelect lang={lang} />
        </div>
        <button type="button" className="nav-burger" aria-expanded={open} aria-controls="nav-menu" aria-label={open ? t.closeMenu : t.openMenu} onClick={() => setOpen((o) => !o)}>
          {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </div>
    </header>
  );
}
