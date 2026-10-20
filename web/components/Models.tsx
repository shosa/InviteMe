"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice, enabledThemes, type Catalog, type ModelDef } from "@inviteme/shared";
import { TemplateCarousel } from "./TemplateCarousel";
import { ui, type Lang } from "@/lib/ui";
import { addonCopy, modelCopy } from "@/lib/catalogCopy";

// Ogni modello offre i temi attivi che lo supportano. L'anteprima è la pagina demo del motore, con dati d'esempio.
export function Models({ catalog, lang = "it" }: { catalog: Catalog; lang?: Lang }) {
  const router = useRouter();
  const L = ui(lang).models;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [themeBy, setThemeBy] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<{ model: ModelDef; theme: string } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  async function order(model: ModelDef, themeId: string) {
    setBusy(model.id);
    setError(null);
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: model.id, themeId, eventType: "wedding" }),
      });
      if (res.status === 401) return router.push("/accedi?next=/#modelli");
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error ?? L.createFailed);
      router.push(`/editor/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : L.unexpected);
      setBusy(null);
    }
  }

  return (
    <div className="models">
      {catalog.models.filter((m) => m.enabled).map((m) => {
        const themes = enabledThemes(catalog, m.id);
        const themeId = themeBy[m.id] ?? themes[0]?.id ?? "";
        const copy = modelCopy(m.id, m.name, m.tagline, m.description, lang);
        return (
          <article key={m.id} className="model">
            <div className="model-stage">
              <TemplateCarousel templates={themes} selectedId={themeId} onSelect={(id) => setThemeBy((p) => ({ ...p, [m.id]: id }))} label={`${L.templatesFor} ${copy.name}`} lang={lang} />
            </div>
            <div className="model-body">
              <div className="model-head">
                <h3>{copy.name}</h3>
                <p className="model-price">{L.from} <b>{formatPrice(m.priceCents)}</b></p>
              </div>
              <p className="model-tagline">{copy.tagline}</p>
              <p className="model-desc">{copy.description}</p>

              {m.included.length > 0 && (
                <ul className="chips">
                  {m.included.map((k) => {
                    const a = catalog.addons.find((x) => x.key === k);
                    return <li key={k}>{a ? addonCopy(a.key, a.label, a.description, lang).label : k}</li>;
                  })}
                </ul>
              )}

              <div className="model-actions">
                <button type="button" className="btn outline" disabled={!themeId} onClick={() => { setPreview({ model: m, theme: themeId }); dialog.current?.showModal(); }}>{L.preview}</button>
                <button type="button" className="btn solid" disabled={busy !== null || !themeId} onClick={() => order(m, themeId)}>
                  {busy === m.id ? L.preparing : L.order}
                </button>
              </div>
            </div>
          </article>
        );
      })}
      {error && <p role="alert" className="form-error models-error">{error}</p>}

      <dialog ref={dialog} className="preview-dialog" onClick={(e) => e.target === dialog.current && dialog.current?.close()}>
        {preview && (
          <div className="preview-inner">
            <div className="preview-head">
              <h3>{modelCopy(preview.model.id, preview.model.name, preview.model.tagline, preview.model.description, lang).name}</h3>
              <button type="button" className="btn ghost small" onClick={() => dialog.current?.close()}>{L.close}</button>
            </div>
            <iframe className="preview-demo" title={L.previewTitle} src={`/api/themes/${preview.theme}/demo`} sandbox="allow-scripts" />
          </div>
        )}
      </dialog>
    </div>
  );
}
