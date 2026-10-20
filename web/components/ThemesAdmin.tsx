"use client";

import { toast } from "sonner";
import type { Catalog } from "@inviteme/shared";
import { Switch } from "./ui/Switch";

// Template: sono cartelle del repository (themes/<id>/), quindi qui si attivano o disattivano, non si caricano.
// La console mostra anche l'anteprima, che è la stessa pagina demo che vedono i clienti nel carosello.
export function ThemesAdmin({ catalog, onChanged }: { catalog: Catalog; onChanged: () => void }) {
  async function setEnabled(id: string, enabled: boolean) {
    const res = await fetch(`/api/admin/themes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) return toast.error(data.error ?? "Modifica non riuscita");
    onChanged();
  }

  return (
    <div className="stack-lg">
      <p className="hint">
        Ogni template è una cartella di <code>themes/</code>: pagina, stile, asset e dati di esempio. I template si aggiungono con un rilascio, non dalla console.
        Per crearne uno nuovo segui <code>docs/TEMI.md</code>. Qui puoi disattivarne uno senza toccare il codice: sparisce dal carosello e dalle nuove ordinazioni.
      </p>

      <div className="theme-list">
        {catalog.themes.map((t) => {
          const m = t.manifest;
          return (
            <article key={m.id} className="theme-row">
              <div className="theme-info">
                <h3>{m.name}</h3>
                <p className="hint">{m.description}</p>
                <p className="theme-specs">
                  Modelli: {m.models.length ? m.models.join(", ") : "tutti"} · Dati di esempio: {Object.keys(m.demo).length}
                </p>
                <a className="btn ghost small" href={`/api/themes/${m.id}/demo`} target="_blank" rel="noopener">Apri anteprima</a>
              </div>
              <div className="theme-actions">
                <Switch checked={t.enabled} onChange={(v) => setEnabled(m.id, v)} label={t.enabled ? "Attivo" : "Disattivato"} />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
