"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice, enabledThemes, type Catalog, type ModelDef } from "@inviteme/shared";
import { TemplateCarousel } from "./TemplateCarousel";
import { ui, type Lang } from "@/lib/ui";
import { addonCopy, modelCopy, themeCopy } from "@/lib/catalogCopy";

// Home in tre passi: scegli lo stile (vetrina), poi il modello (confronto), poi personalizza.
// La barra in basso riepiloga la scelta come un carrello e porta al builder.
export function Models({ catalog, lang = "it" }: { catalog: Catalog; lang?: Lang }) {
  const router = useRouter();
  const L = ui(lang).models;
  const H = ui(lang).home;
  const themes = catalog.themes.filter((t) => t.enabled).map((t) => t.manifest);
  const models = catalog.models.filter((m) => m.enabled);
  const [themeId, setThemeId] = useState(themes[0]?.id ?? "");
  const [modelId, setModelId] = useState(models[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showcase = useRef<HTMLDivElement>(null);
  const compare = useRef<HTMLDivElement>(null);
  const styleManifest = themes.find((t) => t.id === themeId);
  const styleName = styleManifest ? themeCopy(themeId, styleManifest.name, lang) : "";
  const model = models.find((m) => m.id === modelId);
  const compatible = model ? enabledThemes(catalog, model.id).some((t) => t.id === themeId) : false;

  // Scelto un template, la pagina scorre al confronto dei modelli.
  function pickTheme(id: string) {
    setThemeId(id);
    requestAnimationFrame(() => compare.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function order() {
    if (!model) return;
    const list = enabledThemes(catalog, model.id);
    const pick = list.find((t) => t.id === themeId)?.id ?? list[0]?.id;
    if (!pick) return setError(L.createFailed);
    setBusy(true);
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
      setBusy(false);
    }
  }

  return (
    <div className="home-showcase">
      <div ref={showcase} className="showcase-head">
        <h2>{H.themesTitle}</h2>
        <p className="lede">{H.themesLede}</p>
      </div>
      <TemplateCarousel templates={themes} selectedId={themeId} onSelect={pickTheme} label={H.themesTitle} lang={lang} size="lg" />

      <div ref={compare} className="compare">
        <div className="compare-head">
          <div className="pick">
            {styleManifest && (
              <div className="pick-phone" aria-hidden="true">
                <iframe title={styleName} src={`/api/themes/${themeId}/demo`} scrolling="no" tabIndex={-1} />
              </div>
            )}
            <div>
              <p className="kicker">{H.compareKicker}</p>
              <h2>{styleName}</h2>
              <button type="button" className="btn outline small" onClick={() => showcase.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>{H.changeTemplate}</button>
            </div>
          </div>
          <div>
            <h2 className="compare-title">{H.modelsHead}</h2>
            <p className="lede">{H.modelsLede}</p>
          </div>
        </div>

        <div className="model-grid">
          {models.map((m) => {
            const copy = modelCopy(m.id, m.name, m.tagline, m.description, lang);
            const on = m.id === modelId;
            return (
              <article key={m.id} className={`model-card${on ? " is-on" : ""}`} onClick={() => setModelId(m.id)}>
                <div className="model-card-head">
                  <h3>{copy.name}</h3>
                  <p className="model-price"><b>{formatPrice(m.priceCents)}</b></p>
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
                {m.options.length > 0 && (
                  <p className="model-options">{H.optionsLabel}: {m.options.map((k) => { const a = catalog.addons.find((x) => x.key === k); return a ? addonCopy(a.key, a.label, a.description, lang).label : k; }).join(", ")}</p>
                )}
                <button type="button" className={on ? "btn solid" : "btn outline"} aria-pressed={on} onClick={(e) => { e.stopPropagation(); setModelId(m.id); }}>
                  {on ? H.modelChosen : H.chooseModel}
                </button>
              </article>
            );
          })}
        </div>
        {!compatible && model && <p className="hint">{H.noStyleForModel}</p>}
      </div>

      {error && <p role="alert" className="form-error models-error">{error}</p>}

      {model && (
        <div className="order-bar" role="region" aria-label={H.orderBarLabel}>
          <div className="order-bar-item">
            <span className="order-bar-label">{H.styleLabel}</span>
            <strong>{styleName}</strong>
          </div>
          <div className="order-bar-item">
            <span className="order-bar-label">{H.modelLabel}</span>
            <strong>{modelCopy(model.id, model.name, model.tagline, model.description, lang).name}</strong>
          </div>
          <div className="order-bar-item order-bar-price">
            <span className="order-bar-label">{H.totalLabel}</span>
            <strong>{formatPrice(model.priceCents)}</strong>
          </div>
          <button type="button" className="btn solid lg" disabled={busy || !compatible} onClick={order}>
            {busy ? L.preparing : H.customize}
          </button>
        </div>
      )}
    </div>
  );
}
