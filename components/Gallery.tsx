"use client";

import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, TEMPLATES, type Category, type Template } from "@/lib/catalog";
import { defaultConfig, type InviteConfig } from "@/lib/invitation";
import { Invitation } from "./Invitation";

// Crea una bozza dal template scelto e apre il configuratore.
export function useCreateInvitation() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function create(templateId: string) {
    setBusy(templateId);
    setError(null);
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      if (!res.ok) throw new Error("Creazione non riuscita");
      const data = (await res.json()) as { id: string };
      router.push(`/editor/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
      setBusy(null);
    }
  }

  return { create, busy, error };
}

// Anteprima del template con dati di esempio, scalata per la card.
function sampleConfig(t: Template): InviteConfig {
  const base = defaultConfig(t.id, t.category);
  return {
    ...base,
    colors: { bg: t.palette.bg, ink: t.palette.ink, accent: t.palette.accent },
    font: t.font,
    message: t.tagline,
    eventDate: "2027-06-12", // data fissa: evita mismatch di idratazione tra server e client
    addons: [],
  };
}

function TiltCard({ t, onPick, busy }: { t: Template; onPick: (id: string) => void; busy: boolean }) {
  // Inclinazione 3D che segue il cursore: l'anteprima "prende vita" senza animazioni pesanti.
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: y * -8, y: x * 10 });
  };
  return (
    <article className="tpl">
      <div
        className="tpl-stage"
        onMouseMove={onMove}
        onMouseLeave={() => setTilt({ x: 0, y: 0 })}
        style={{ transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      >
        <div className="tpl-scale">
          <Invitation config={sampleConfig(t)} />
        </div>
        {t.badge && <span className={`badge ${t.badge.toLowerCase()}`}>{t.badge}</span>}
      </div>
      <div className="tpl-meta">
        <div>
          <h3>{t.name}</h3>
          <p>{t.tagline}</p>
        </div>
        <button type="button" className="btn" disabled={busy} onClick={() => onPick(t.id)}>
          {busy ? "Preparo…" : "Personalizza"}
        </button>
      </div>
    </article>
  );
}

export function Gallery() {
  const [cat, setCat] = useState<Category | "all">("all");
  const { create, busy, error } = useCreateInvitation();
  const list = TEMPLATES.filter((t) => cat === "all" || t.category === cat);

  return (
    <div className="gallery">
      <div className="chips" role="tablist" aria-label="Tipologia di evento">
        <button role="tab" aria-selected={cat === "all"} className={cat === "all" ? "chip on" : "chip"} onClick={() => setCat("all")}>
          Tutti
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={cat === c.id}
            className={cat === c.id ? "chip on" : "chip"}
            onClick={() => setCat(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="error">{error}</p>}
      <div className="tpl-grid">
        {list.map((t) => (
          <TiltCard key={t.id} t={t} busy={busy === t.id} onPick={create} />
        ))}
      </div>
    </div>
  );
}

export function CreateButton({ label, className }: { label: string; className?: string }) {
  const { create, busy, error } = useCreateInvitation();
  return (
    <>
      <button type="button" className={className} disabled={!!busy} onClick={() => create(TEMPLATES[0].id)}>
        {busy ? "Preparo il tuo invito…" : label}
      </button>
      {error && <span role="alert" className="error">{error}</span>}
    </>
  );
}
