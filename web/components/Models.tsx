"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BLOCKS, formatPrice, enabledThemes, themeCategories, type BlockDef, type Catalog, type ModelDef, type ThemeCategory } from "@inviteme/shared";
import { CATEGORY_LIST, allLabel, categoryLabel } from "@/lib/categoryCopy";
import { Check, Plus } from "lucide-react";
import { BlockIcon } from "@/lib/blockIcons";
import { TemplateCarousel } from "./TemplateCarousel";
import { ui, type Lang } from "@/lib/ui";
import { addonCopy, blockCopy, modelCopy, themeCopy } from "@/lib/catalogCopy";

// Home in tre passi: scegli lo stile (vetrina), confronta i modelli con i blocchi inclusi e aggiungibili, poi personalizza.
// La barra in basso riepiloga la scelta come un carrello e porta al builder.
export function Models({ catalog, lang = "it" }: { catalog: Catalog; lang?: Lang }) {
  const router = useRouter();
  const L = ui(lang).models;
  const H = ui(lang).home;
  const themes = catalog.themes.filter((t) => t.enabled).map((t) => t.manifest);
  const models = catalog.models.filter((m) => m.enabled);
  const [themeId, setThemeId] = useState(themes[0]?.id ?? "");
  // Vetrina: template raggruppati per categoria, ordine casuale dentro ogni gruppo a ogni navigazione.
  const [shuffled, setShuffled] = useState(themes);
  const [filter, setFilter] = useState<"all" | ThemeCategory>("all");
  const [seed] = useState(() => Math.random().toString(36).slice(2, 8));
  useEffect(() => {
    const copy = [...themes];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    setShuffled(copy);
    setThemeId(copy[0]?.id ?? "");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Gruppo "Tutti": prima i matrimoni, poi le altre categorie; nel gruppo l'ordine è casuale.
  const visible = filter === "all"
    ? CATEGORY_LIST.flatMap((c) => shuffled.filter((t) => themeCategories(t.id)[0] === c))
    : shuffled.filter((t) => themeCategories(t.id).includes(filter));
  const countOf = (c: ThemeCategory) => shuffled.filter((t) => themeCategories(t.id).includes(c)).length;
  function changeFilter(f: "all" | ThemeCategory) {
    setFilter(f);
    const next = f === "all" ? shuffled : shuffled.filter((t) => themeCategories(t.id).includes(f));
    if (!next.some((t) => t.id === themeId)) setThemeId(next[0]?.id ?? "");
  }
  const [modelId, setModelId] = useState(models[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gallery = useRef<HTMLElement>(null);
  const modelsSection = useRef<HTMLElement>(null);
  const styleManifest = themes.find((t) => t.id === themeId);
  const styleName = styleManifest ? themeCopy(themeId, styleManifest.name, lang) : "";
  const model = models.find((m) => m.id === modelId);
  const compatible = model ? enabledThemes(catalog, model.id).some((t) => t.id === themeId) : false;
  const en = lang === "en";
  const T = en
    ? { included: "Included in the price", optional: "Add when you need it", blocks: "What goes in your invitation", blocksText: "Every block you can place on the page. Included blocks are ready; the others unlock with the feature.", base: "Included", add: "Add", unavailable: "Not with this model", popular: "Most chosen", inc: "Included", ask: "Choose this model", chosen: "Chosen", perks: "Pay once, no subscription", free: "Free" }
    : { included: "Incluso nel prezzo", optional: "Aggiungibile quando serve", blocks: "Cosa va nel vostro invito", blocksText: "Tutti i blocchi che puoi mettere nella pagina. Quelli inclusi sono pronti; gli altri si sbloccano con la funzione.", base: "Incluso", add: "Aggiungi", unavailable: "Non con questo modello", popular: "Il più scelto", inc: "Incluso", ask: "Scegli questo modello", chosen: "Modello scelto", perks: "Si paga una volta, senza abbonamenti", free: "Gratis" };

  // Stato di un blocco per il modello: sempre incluso, aggiungibile con una funzione, o non disponibile.
  function blockState(b: BlockDef, m: ModelDef | undefined): "base" | "included" | "option" | "na" {
    if (!b.feature) return "base";
    if (!m) return "na";
    if (m.included.includes(b.feature)) return "included";
    if (m.options.includes(b.feature)) return "option";
    return "na";
  }
  const addonPrice = (key: string) => catalog.addons.find((a) => a.key === key);

  // Scelto un template dal carosello: l'anteprima si aggiorna e la pagina scorre alla scelta del modello.
  function pickTheme(id: string) {
    setThemeId(id);
    requestAnimationFrame(() => modelsSection.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
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

  const blockCount = BLOCKS.filter((b) => blockState(b, model) !== "na").length;
  const optionCount = BLOCKS.filter((b) => blockState(b, model) === "option").length;
  return (
    <div className="home-showcase">
      <section ref={gallery} className="hm-gallery" aria-labelledby="hm-gallery-title">
        <div className="hm-gallery-head">
          <div>
            <h2 id="hm-gallery-title">{H.themesTitle}</h2>
            <p className="lede">{H.themesLede}</p>
          </div>
          <div className="tpl-filters" role="group" aria-label={H.themesTitle}>
            <button type="button" className={filter === "all" ? "is-on" : ""} aria-pressed={filter === "all"} onClick={() => changeFilter("all")}>{allLabel(lang)} <small>{shuffled.length}</small></button>
            {CATEGORY_LIST.filter((c) => countOf(c) > 0).map((c) => (
              <button key={c} type="button" className={filter === c ? "is-on" : ""} aria-pressed={filter === c} onClick={() => changeFilter(c)}>{categoryLabel(c, lang)} <small>{countOf(c)}</small></button>
            ))}
          </div>
        </div>
        <TemplateCarousel templates={visible} selectedId={themeId} onSelect={pickTheme} label={H.themesTitle} lang={lang} size="lg" />
      </section>

      <section className="hm-style">
        {styleManifest && (
          <div className="pick-phone" aria-hidden="true">
            <iframe title={styleName} src={`/api/themes/${themeId}/demo?lang=${lang}&s=${seed}`} scrolling="no" tabIndex={-1} />
          </div>
        )}
        <div className="hm-style-text">
          <span className="hm-kicker">{H.compareKicker}</span>
          <h2>{styleName}</h2>
          <span className="hm-tag">{styleManifest ? categoryLabel(themeCategories(styleManifest.id)[0], lang) : ""}</span>
          <div className="hm-actions">
            <button type="button" className="btn outline" onClick={() => gallery.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>{H.changeTemplate}</button>
            <a className="btn outline" href={`/api/themes/${themeId}/anteprima?lang=${lang}&s=${seed}`} target="_blank" rel="noopener noreferrer">{H.stylePreview}</a>
            <button type="button" className="btn solid" onClick={() => modelsSection.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>{en ? "Choose model" : "Scegli modello"}</button>
          </div>
          <ul className="hm-pills" aria-label={T.blocks}>
            {BLOCKS.map((b) => {
              const st = blockState(b, model);
              return (
                <li key={b.type} className={`bar-pill is-${st}`} title={blockCopy(b.type, b.label, lang)}>
                  <BlockIcon type={b.type} size={14} />
                  <span>{blockCopy(b.type, b.label, lang)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section ref={modelsSection} className="hm-models">
        <h2>{H.modelsHead}</h2>
        <p className="lede">{H.modelsLede}</p>
        <div className="plan-options" role="radiogroup" aria-label={H.modelsHead}>
          {models.map((m) => {
            const copy = modelCopy(m.id, m.name, m.tagline, m.description, lang);
            const on = m.id === modelId;
            return (
              <button key={m.id} type="button" role="radio" aria-checked={on} className={`plan-option${on ? " is-on" : ""}`} onClick={() => setModelId(m.id)}>
                {m.id === "invitation-rsvp" && <span className="plan-option-tag">{T.popular}</span>}
                <strong>{copy.name}</strong>
                <span className="plan-option-tagline">{copy.tagline}</span>
                <span className="plan-option-price">{m.id === "custom" && <small className="plan-option-from">{en ? "From" : "A partire da"}</small>}{formatPrice(m.priceCents)}</span>
              </button>
            );
          })}
        </div>
        {model && (
          <details className="plan-details" open>
            <summary>{en ? "What's included in" : "Cosa include"} {modelCopy(model.id, model.name, model.tagline, model.description, lang).name}</summary>
            <p className="plan-desc">{modelCopy(model.id, model.name, model.tagline, model.description, lang).description}</p>
            <div className="plan-split">
              <div>
                <h4 className="plan-sub">{T.included}</h4>
                <ul className="plan-blocks">
                  {BLOCKS.filter((b) => blockState(b, model) === "included" || blockState(b, model) === "base").map((b) => (
                    <li key={b.type}><BlockIcon type={b.type} />{blockCopy(b.type, b.label, lang)}</li>
                  ))}
                  {model.included.filter((k) => !BLOCKS.some((b) => b.feature === k)).map((k) => {
                    const a = addonPrice(k);
                    return a ? <li key={k}><Check size={17} aria-hidden="true" />{addonCopy(a.key, a.label, a.description, lang).label}</li> : null;
                  })}
                </ul>
              </div>
              <div>
                <h4 className="plan-sub">{T.optional}</h4>
                <ul className="plan-blocks is-option">
                  {model.options.filter((k) => !model.included.includes(k)).map((k) => {
                    const a = addonPrice(k);
                    if (!a) return null;
                    return <li key={k}><Plus size={17} aria-hidden="true" /><span>{addonCopy(a.key, a.label, a.description, lang).label}</span><em>+ {formatPrice(a.cents)}</em></li>;
                  })}
                </ul>
              </div>
            </div>
            {!compatible && <p className="hint">{H.noStyleForModel}</p>}
          </details>
        )}
      </section>

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
