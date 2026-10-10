"use client";

import { useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { defaultConfig, formatPrice, getStyle, activeFeatures, type Catalog, type ModelDef, type AddonKey, type InviteConfig } from "@inviteme/shared";
import { Invitation } from "./Invitation";

// Esempio per l'anteprima: data fissa per evitare differenze tra server e browser.
const SAMPLE_PHOTO: Record<string, string> = {
  "save-the-date": "/stock/eucalyptus-banquet-lena-eggler.jpg",
  "invitation-rsvp": "/stock/table-decor-caleb-oquendo.jpg",
  custom: "/stock/outdoor-table-angel-ayala.jpg",
};

function sample(c: Catalog, model: ModelDef, styleId: string): InviteConfig {
  return {
    ...defaultConfig(c, model.id, "wedding"),
    photos: SAMPLE_PHOTO[model.id] ? [SAMPLE_PHOTO[model.id]] : [],
    styleId,
    eventDate: "2027-06-12",
    eventTime: "18:00",
    message: model.included.includes("rsvp") || model.options.includes("rsvp") ? "Abbiamo il piacere di invitarvi a festeggiare con noi." : "Ci sposiamo, segnatelo in agenda.",
    addons: model.options.filter((k) => ["countdown", "map"].includes(k)).slice(0, 2),
  };
}

export function Models({ catalog }: { catalog: Catalog }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [styleBy, setStyleBy] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<ModelDef | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const styles = catalog.styles.filter((s) => s.enabled);

  async function order(model: ModelDef, styleId: string) {
    setBusy(model.id);
    setError(null);
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: model.id, styleId, eventType: "wedding" }),
      });
      if (res.status === 401) return router.push("/accedi?next=/#modelli");
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error ?? "Creazione non riuscita");
      router.push(`/editor/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore imprevisto");
      setBusy(null);
    }
  }

  const previewStyle = preview ? styleBy[preview.id] ?? styles[0]?.id : "";
  const previewCfg = preview ? sample(catalog, preview, previewStyle) : null;
  const previewStyleDef = previewStyle ? getStyle(catalog, previewStyle) : styles[0];

  return (
    <div className="models">
      {catalog.models.filter((m) => m.enabled).map((m) => {
        const styleId = styleBy[m.id] ?? styles[0]?.id ?? "";
        const cfg = sample(catalog, m, styleId);
        const feats = [...activeFeatures(catalog, m.id, cfg.addons)] as AddonKey[];
        return (
          <article key={m.id} className="model">
            <div className="model-stage">
              <div className="model-card">
                <Invitation config={cfg} style={getStyle(catalog, styleId)} features={feats} />
              </div>
            </div>
            <div className="model-body">
              <div className="model-head">
                <h3>{m.name}</h3>
                <p className="model-price">da <b>{formatPrice(m.priceCents)}</b></p>
              </div>
              <p className="model-tagline">{m.tagline}</p>
              <p className="model-desc">{m.description}</p>

              {m.included.length > 0 && (
                <ul className="chips">
                  {m.included.map((k) => <li key={k}>{catalog.addons.find((a) => a.key === k)?.label ?? k}</li>)}
                </ul>
              )}

              <div className="swatches" role="radiogroup" aria-label={`Tema per ${m.name}`}>
                {styles.map((s) => (
                  <label key={s.id} className="swatch" title={s.name} style={{ "--sw-bg": s.bg, "--sw-ink": s.accent } as CSSProperties}>
                    <input type="radio" name={`style-${m.id}`} value={s.id} checked={styleId === s.id} onChange={() => setStyleBy((p) => ({ ...p, [m.id]: s.id }))} />
                    <span className="swatch-dot" aria-hidden />
                    <span className="swatch-name">{s.name}</span>
                  </label>
                ))}
              </div>

              <div className="model-actions">
                <button type="button" className="btn outline" onClick={() => { setPreview(m); dialog.current?.showModal(); }}>Anteprima</button>
                <button type="button" className="btn solid" disabled={busy !== null} onClick={() => order(m, styleId)}>
                  {busy === m.id ? "Preparo…" : "Ordina"}
                </button>
              </div>
            </div>
          </article>
        );
      })}
      {error && <p role="alert" className="form-error models-error">{error}</p>}

      <dialog ref={dialog} className="preview-dialog" onClick={(e) => e.target === dialog.current && dialog.current?.close()}>
        {preview && previewCfg && previewStyleDef && (
          <div className="preview-inner">
            <div className="preview-head">
              <h3>{preview.name}</h3>
              <button type="button" className="btn ghost small" onClick={() => dialog.current?.close()}>Chiudi</button>
            </div>
            <div className="preview-scroll">
              <Invitation config={previewCfg} style={previewStyleDef} features={[...activeFeatures(catalog, preview.id, previewCfg.addons)] as AddonKey[]} />
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
