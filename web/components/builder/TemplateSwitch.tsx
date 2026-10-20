"use client";

import { useState } from "react";
import type { ThemeManifest } from "@inviteme/shared";
import { TemplateCarousel } from "../TemplateCarousel";
import { themeCopy } from "@/lib/catalogCopy";
import type { Lang } from "@/lib/ui";

// Cambio del template dal builder: una galleria in popup. Il contenuto resta, si azzerano solo i colori personalizzati.
// Dopo l'acquisto il pulsante non c'è: il template è fissato.
export function TemplateSwitch({ themes, currentId, locked, onConfirm, lang = "it" }: { themes: ThemeManifest[]; currentId: string; locked: boolean; onConfirm: (id: string) => void; lang?: Lang }) {
  const en = lang === "en";
  const T = en
    ? { title: "Template", change: "Change template", fixed: "Template fixed after purchase", gallery: "Choose a new template", note: "Your texts, photos and blocks stay. Only custom colours go back to the template's own.", cancel: "Cancel", use: "Use this template", current: "Current" }
    : { title: "Template", change: "Cambia template", fixed: "Template fissato dopo l'acquisto", gallery: "Scegli un nuovo template", note: "Testi, foto e blocchi restano. Tornano al template solo i colori personalizzati.", cancel: "Annulla", use: "Usa questo template", current: "Attuale" };
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState(currentId);
  const current = themes.find((t) => t.id === currentId);
  const name = current ? themeCopy(current.id, current.name, lang) : currentId;

  function confirm() {
    if (pick !== currentId) onConfirm(pick);
    setOpen(false);
  }

  return (
    <>
      <div className="tpl-switch">
        <div>
          <span className="tpl-switch-label">{T.title}</span>
          <strong>{name}</strong>
        </div>
        {locked ? <small className="tpl-switch-fixed">{T.fixed}</small> : <button type="button" className="btn outline small" onClick={() => { setPick(currentId); setOpen(true); }}>{T.change}</button>}
      </div>
      {open && (
        <div className="welcome-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="welcome tpl-gallery" role="dialog" aria-modal="true" aria-labelledby="tpl-gallery-title">
            <h2 id="tpl-gallery-title">{T.gallery}</h2>
            <p className="hint">{T.note}</p>
            <TemplateCarousel templates={themes} selectedId={pick} onSelect={setPick} label={T.gallery} lang={lang} size="lg" />
            <div className="welcome-actions">
              <button type="button" className="btn ghost" onClick={() => setOpen(false)}>{T.cancel}</button>
              <button type="button" className="btn solid" disabled={pick === currentId} onClick={confirm}>{pick === currentId ? T.current : T.use}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
