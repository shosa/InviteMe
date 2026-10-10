"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";
import type { Catalog, StyleDef } from "@inviteme/shared";
import { Switch } from "./ui/Switch";

const FRAME_LABEL: Record<string, string> = { arch: "arco", rect: "rettangolo", oval: "ovale" };
const COVER_LABEL: Record<string, string> = { envelope: "busta sigillata", none: "nessuna copertina" };
const REVEAL_LABEL: Record<string, string> = { fade: "dissolvenza", rise: "sale dal basso", none: "immediata" };

// Gestione temi: attivazione, caricamento di un tema JSON e eliminazione dei temi caricati.
export function ThemesAdmin({ catalog, onChanged }: { catalog: Catalog; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const themes = catalog.styles;

  async function setEnabled(id: string, enabled: boolean) {
    const res = await fetch(`/api/admin/themes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) return toast.error(data.error ?? "Modifica non riuscita");
    onChanged();
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`Eliminare il tema "${name}"? Gli inviti che lo usano torneranno al tema predefinito.`)) return;
    const res = await fetch(`/api/admin/themes/${id}`, { method: "DELETE" });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) return toast.error(data.error ?? "Eliminazione non riuscita");
    toast.success("Tema eliminato");
    onChanged();
  }

  async function upload(file: File) {
    setErrors([]);
    setBusy(true);
    try {
      const text = await file.text();
      let body: unknown;
      try {
        body = JSON.parse(text);
      } catch {
        setErrors(["Il file non è JSON valido."]);
        return;
      }
      const res = await fetch("/api/admin/themes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { error?: string; errors?: string[]; name?: string };
      if (!res.ok) {
        setErrors(data.errors?.length ? data.errors : [data.error ?? "Caricamento non riuscito"]);
        return;
      }
      toast.success(`Tema "${data.name}" caricato`);
      onChanged();
    } catch {
      setErrors(["Connessione assente: il tema non è stato caricato."]);
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className="stack-lg">
      <p className="hint">
        Un tema è una variante grafica di un modello: forma della cornice, colori, tipografia, copertina, rivelazione e musica di default. Il cliente sceglie il tema, non i singoli colori.
        Per creare un tema nuovo segui il manuale in <code>docs/THEMES.md</code>.
      </p>

      <div className="theme-list">
        {themes.map((t: StyleDef) => (
          <article key={t.id} className="theme-row" style={{ "--th-bg": t.palette?.paper ?? t.bg, "--th-ink": t.palette?.ink ?? t.ink, "--th-accent": t.palette?.accent ?? t.accent } as React.CSSProperties}>
            <span className="theme-swatch" aria-hidden="true" />
            <div className="theme-info">
              <h3>{t.name} {t.builtin && <span className="theme-badge">preimpostato</span>}</h3>
              <p className="hint">{t.description}</p>
              <p className="theme-specs">
                Modelli: {(t.models ?? []).join(", ")} · Cornice: {FRAME_LABEL[t.shape?.frame ?? "arch"]} · Copertina: {COVER_LABEL[t.motion?.cover ?? "envelope"]} · Rivelazione: {REVEAL_LABEL[t.motion?.reveal ?? "fade"]}
              </p>
            </div>
            <div className="theme-actions">
              <Switch checked={t.enabled} onChange={(v) => setEnabled(t.id, v)} label={t.enabled ? "Attivo" : "Disattivato"} />
              {!t.builtin && (
                <button type="button" className="btn ghost small" onClick={() => remove(t.id, t.name)} aria-label={`Elimina ${t.name}`}>
                  <Trash2 size={16} aria-hidden="true" />
                  Elimina
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      <section className="block">
        <h3>Carica un tema</h3>
        <p className="hint">File JSON con il formato di <code>docs/THEMES.md</code>. Il tema viene controllato campo per campo: se qualcosa non va, vedi l&apos;elenco degli errori.</p>
        <label className="upload">
          <input ref={fileInput} type="file" accept="application/json,.json" disabled={busy} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <span className="upload-inner"><Upload size={18} aria-hidden="true" />{busy ? "Controllo il tema…" : "Scegli un file .json"}</span>
        </label>
        {errors.length > 0 && (
          <ul className="form-error theme-errors" role="alert">
            {errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        )}
      </section>
    </div>
  );
}
