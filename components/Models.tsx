"use client";

import { useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { MODELS, STYLES, formatPrice, type ModelId } from "@/lib/catalog";
import { defaultConfig, type InviteConfig } from "@/lib/invitation";
import { Invitation } from "./Invitation";

// Esempio di invito per l'anteprima: data fissa per evitare mismatch di idratazione.
function sample(model: ModelId, styleId: string): InviteConfig {
  return {
    ...defaultConfig(model, "wedding"),
    styleId,
    eventDate: "2027-06-12",
    eventTime: "18:00",
    message: model === "save-the-date" ? "Ci sposiamo, segnatelo in agenda." : "Abbiamo il piacere di invitarvi a festeggiare con noi.",
    addons: model === "save-the-date" ? ["countdown"] : ["map"],
  };
}

// Crea una bozza del modello scelto. Richiede l'accesso: senza sessione, va alla pagina di accesso.
export function useCreateInvitation() {
  const router = useRouter();
  const [busy, setBusy] = useState<ModelId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function create(model: ModelId, styleId: string) {
    setBusy(model);
    setError(null);
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, styleId, eventType: "wedding" }),
      });
      if (res.status === 401) {
        router.push(`/accedi?next=${encodeURIComponent(`/#modelli`)}`);
        return;
      }
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error ?? "Creazione non riuscita");
      router.push(`/editor/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore imprevisto");
      setBusy(null);
    }
  }

  return { create, busy, error };
}

export function Models() {
  const { create, busy, error } = useCreateInvitation();
  const [styleByModel, setStyleByModel] = useState<Record<ModelId, string>>({
    "save-the-date": STYLES[0].id,
    "invitation-rsvp": STYLES[0].id,
  });
  const [preview, setPreview] = useState<ModelId | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  function openPreview(model: ModelId) {
    setPreview(model);
    dialog.current?.showModal();
  }

  const previewModel = MODELS.find((m) => m.id === preview);

  return (
    <div className="models">
      {MODELS.map((m) => {
        const styleId = styleByModel[m.id];
        return (
          <article key={m.id} className="model">
            <div className="model-stage" aria-hidden>
              <div className="model-card">
                <Invitation config={sample(m.id, styleId)} />
              </div>
            </div>
            <div className="model-body">
              <p className="model-price">da {formatPrice(m.priceCents)} · pagamento unico</p>
              <h3>{m.name}</h3>
              <p className="model-tagline">{m.tagline}</p>
              <p className="model-desc">{m.description}</p>

              <fieldset className="swatches">
                <legend>Stile</legend>
                {STYLES.map((s) => (
                  <label key={s.id} className="swatch" style={{ "--sw-bg": s.bg, "--sw-ink": s.accent } as CSSProperties}>
                    <input
                      type="radio"
                      name={`style-${m.id}`}
                      value={s.id}
                      checked={styleId === s.id}
                      onChange={() => setStyleByModel((prev) => ({ ...prev, [m.id]: s.id }))}
                    />
                    <span className="swatch-dot" aria-hidden />
                    <span>{s.name}</span>
                  </label>
                ))}
              </fieldset>

              <div className="model-actions">
                <button type="button" className="btn ghost" onClick={() => openPreview(m.id)}>Anteprima</button>
                <button type="button" className="btn solid" disabled={busy !== null} onClick={() => create(m.id, styleId)}>
                  {busy === m.id ? "Preparo…" : "Ordina"}
                </button>
              </div>
            </div>
          </article>
        );
      })}
      {error && <p role="alert" className="form-error models-error">{error}</p>}

      <dialog ref={dialog} className="preview-dialog" onClick={(e) => e.target === dialog.current && dialog.current.close()}>
        {previewModel && preview && (
          <div className="preview-inner">
            <div className="preview-head">
              <h3>{previewModel.name}</h3>
              <button type="button" className="btn ghost" onClick={() => dialog.current?.close()}>Chiudi</button>
            </div>
            <div className="preview-scroll">
              <Invitation config={sample(preview, styleByModel[preview])} />
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
