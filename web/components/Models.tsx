"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice, enabledThemes, type Catalog, type ModelDef } from "@inviteme/shared";
import { TemplateCarousel } from "./TemplateCarousel";
import { ui, type Lang } from "@/lib/ui";
import { addonCopy, modelCopy, themeCopy } from "@/lib/catalogCopy";

// Home: prima la vetrina dei template (stili grafici), poi i modelli (cosa include il prezzo).
// Lo stile selezionato nella vetrina si applica a qualunque modello compatibile.
export function Models({ catalog, lang = "it" }: { catalog: Catalog; lang?: Lang }) {
  const router = useRouter();
  const L = ui(lang).models;
  const H = ui(lang).home;
  const themes = catalog.themes.filter((t) => t.enabled).map((t) => t.manifest);
  const [themeId, setThemeId] = useState(themes[0]?.id ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const styleName = themeCopy(themeId, themes.find((t) => t.id === themeId)?.name ?? "", lang);

  async function order(model: ModelDef) {
    const compatible = enabledThemes(catalog, model.id);
    const pick = compatible.find((t) => t.id === themeId)?.id ?? compatible[0]?.id;
    if (!pick) return setError(L.createFailed);
    setBusy(model.id);
    setError(null);
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: model.id, themeId: pick, eventType: "wedding" }),
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
    <div className="home-showcase">
      <div className="showcase-head">
        <h2>{H.themesTitle}</h2>
        <p className="lede">{H.themesLede}</p>
      </div>
      <TemplateCarousel templates={themes} selectedId={themeId} onSelect={setThemeId} label={H.themesTitle} lang={lang} size="lg" />
      <div className="showcase-actions">
        <button type="button" className="btn outline" disabled={!themeId} onClick={() => dialog.current?.showModal()}>{L.preview}</button>
      </div>

      <div className="showcase-head models-head">
        <h2>{H.modelsHead}</h2>
        <p className="lede">{H.modelsLede}</p>
      </div>
      <div className="model-grid">
        {catalog.models.filter((m) => m.enabled).map((m) => {
          const copy = modelCopy(m.id, m.name, m.tagline, m.description, lang);
          const compatible = enabledThemes(catalog, m.id).some((t) => t.id === themeId);
          return (
            <article key={m.id} className="model-card">
              <div className="model-card-head">
                <h3>{copy.name}</h3>
                <p className="model-price">{L.from} <b>{formatPrice(m.priceCents)}</b></p>
              </div>
              <p className="model-tagline">{copy.tagline}</p>
              <p className="model-desc">{copy.description}</p>
              {m.included.length > 0 && (
                <ul className="chips" aria-label={L.from}>
                  {m.included.map((k) => {
                    const a = catalog.addons.find((x) => x.key === k);
                    return <li key={k}>{a ? addonCopy(a.key, a.label, a.description, lang).label : k}</li>;
                  })}
                </ul>
              )}
              {compatible && <p className="model-style">{H.withStyle(styleName)}</p>}
              <button type="button" className="btn solid" disabled={busy !== null} onClick={() => order(m)}>
                {busy === m.id ? L.preparing : L.order}
              </button>
            </article>
          );
        })}
      </div>
      {error && <p role="alert" className="form-error models-error">{error}</p>}

      <dialog ref={dialog} className="preview-dialog" onClick={(e) => e.target === dialog.current && dialog.current?.close()}>
        <div className="preview-inner">
          <div className="preview-head">
            <h3>{styleName}</h3>
            <button type="button" className="btn ghost small" onClick={() => dialog.current?.close()}>{L.close}</button>
          </div>
          <iframe className="preview-demo" title={H.stylePreview} src={`/api/themes/${themeId}/demo`} sandbox="allow-scripts" />
        </div>
      </dialog>
    </div>
  );
}
