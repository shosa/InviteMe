"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Invitation } from "./Invitation";
import { PRICING, formatPrice, type AddonKey, type Template } from "@/lib/catalog";
import { totalCents } from "@/lib/pricing";
import type { InviteConfig, RsvpQuestion } from "@/lib/invitation";

type Tab = "testi" | "stile" | "foto" | "programma" | "rsvp" | "extra";
const TABS: { id: Tab; label: string }[] = [
  { id: "testi", label: "Testi" },
  { id: "stile", label: "Stile" },
  { id: "foto", label: "Foto" },
  { id: "programma", label: "Programma" },
  { id: "rsvp", label: "RSVP" },
  { id: "extra", label: "Extra" },
];

const MAX_PHOTO_BYTES = 2_000_000;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function Builder({ template, initial }: { template: Template; initial: { id: string; slug: string; config: InviteConfig; status: "draft" | "paid" } }) {
  const [config, setConfig] = useState<InviteConfig>(initial.config);
  const [status, setStatus] = useState<"draft" | "paid">(initial.status);
  const [tab, setTab] = useState<Tab>("testi");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstRun = useRef(true);
  const locked = status === "paid";

  // Autosalvataggio con debounce: ogni modifica è persistita senza un pulsante "salva".
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (locked) return;
    setSaveState("saving");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/invitations/${initial.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        });
        setSaveState(res.ok ? "saved" : "error");
      } catch {
        setSaveState("error");
      }
    }, 600);
    return () => clearTimeout(t);
  }, [config, initial.id, locked]);

  const total = useMemo(() => totalCents(config.addons), [config.addons]);

  function patch(p: Partial<InviteConfig>) {
    setConfig((c) => ({ ...c, ...p }));
  }

  function toggleAddon(key: AddonKey) {
    setConfig((c) => ({
      ...c,
      addons: c.addons.includes(key) ? c.addons.filter((k) => k !== key) : [...c.addons, key],
    }));
  }

  async function addPhotos(files: FileList | null) {
    if (!files) return;
    const room = 3 - config.photos.length;
    const picked = Array.from(files).slice(0, Math.max(0, room));
    const tooBig = picked.find((f) => f.size > MAX_PHOTO_BYTES);
    if (tooBig) {
      setError(`"${tooBig.name}" supera 2 MB. Scegli un'immagine più leggera.`);
      return;
    }
    const urls = await Promise.all(picked.map(readAsDataUrl));
    patch({ photos: [...config.photos, ...urls] });
  }

  function updateSection(id: string, field: "title" | "body", value: string) {
    patch({ sections: config.sections.map((s) => (s.id === id ? { ...s, [field]: value } : s)) });
  }

  function addSection() {
    if (config.sections.length >= 5) return;
    patch({ sections: [...config.sections, { id: crypto.randomUUID(), title: "Nuova sezione", body: "Scrivi qui il dettaglio." }] });
  }

  function updateQuestion(id: string, field: keyof RsvpQuestion, value: string) {
    patch({ rsvpQuestions: config.rsvpQuestions.map((q) => (q.id === id ? { ...q, [field]: value } : q)) });
  }

  function addQuestion() {
    if (config.rsvpQuestions.length >= 6) return;
    patch({
      rsvpQuestions: [...config.rsvpQuestions, { id: crypto.randomUUID(), label: "Nuova domanda", type: "text" }],
    });
  }

  async function checkout() {
    setCheckingOut(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId: initial.id }),
      });
      const data = (await res.json()) as { checkoutUrl?: string; error?: string };
      if (!res.ok || !data.checkoutUrl) throw new Error(data.error ?? "Checkout non disponibile");
      window.location.href = data.checkoutUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore imprevisto");
      setCheckingOut(false);
    }
  }

  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const shareUrl = `${origin}/i/${initial.slug}`;
  const waLink = `https://wa.me/?text=${encodeURIComponent(`Ti invito! Trovi tutti i dettagli qui: ${shareUrl}`)}`;

  return (
    <div className="builder">
      <aside className="builder-panel" aria-label="Configuratore">
        <header className="builder-head">
          <a href="/" className="brand-mini">InviteMe</a>
          <span className={`save save-${saveState}`} aria-live="polite">
            {locked ? "Pagato · bloccato" : saveState === "saving" ? "Salvataggio…" : saveState === "error" ? "Errore di salvataggio" : "Salvato"}
          </span>
        </header>

        <nav className="tabs" role="tablist" aria-label="Sezioni del builder">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? "tab on" : "tab"}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <fieldset className="pane" disabled={locked}>
          {tab === "testi" && (
            <div className="grid">
              <Field label="Titolo"><input value={config.title} onChange={(e) => patch({ title: e.target.value })} /></Field>
              <Field label="Chi invita"><input value={config.hosts} onChange={(e) => patch({ hosts: e.target.value })} /></Field>
              <Field label="Data"><input type="date" value={config.eventDate} onChange={(e) => patch({ eventDate: e.target.value })} /></Field>
              <Field label="Ora"><input type="time" value={config.eventTime} onChange={(e) => patch({ eventTime: e.target.value })} /></Field>
              <Field label="Luogo"><input value={config.venue} onChange={(e) => patch({ venue: e.target.value })} /></Field>
              <Field label="Indirizzo"><input value={config.address} onChange={(e) => patch({ address: e.target.value })} /></Field>
              <Field label="Messaggio" wide><textarea rows={3} value={config.message} onChange={(e) => patch({ message: e.target.value })} /></Field>
            </div>
          )}

          {tab === "stile" && (
            <div className="grid">
              <Field label="Colore sfondo"><input type="color" value={config.colors.bg} onChange={(e) => patch({ colors: { ...config.colors, bg: e.target.value } })} /></Field>
              <Field label="Colore testo"><input type="color" value={config.colors.ink} onChange={(e) => patch({ colors: { ...config.colors, ink: e.target.value } })} /></Field>
              <Field label="Colore accento"><input type="color" value={config.colors.accent} onChange={(e) => patch({ colors: { ...config.colors, accent: e.target.value } })} /></Field>
              <Field label="Carattere">
                <select value={config.font} onChange={(e) => patch({ font: e.target.value as InviteConfig["font"] })}>
                  <option value="serif">Classico</option>
                  <option value="script">Corsivo</option>
                  <option value="sans">Moderno</option>
                </select>
              </Field>
              <Field label="Lingua">
                <select value={config.locale} onChange={(e) => patch({ locale: e.target.value as InviteConfig["locale"] })}>
                  <option value="it">Italiano</option>
                  <option value="en">English</option>
                </select>
              </Field>
            </div>
          )}

          {tab === "foto" && (
            <div className="stack">
              <p className="hint">Fino a 3 foto, massimo 2 MB ciascuna.</p>
              <div className="thumbs">
                {config.photos.map((src, i) => (
                  <div key={i} className="thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Foto ${i + 1}`} />
                    <button type="button" aria-label={`Rimuovi foto ${i + 1}`} onClick={() => patch({ photos: config.photos.filter((_, j) => j !== i) })}>×</button>
                  </div>
                ))}
              </div>
              {config.photos.length < 3 && (
                <label className="upload">
                  <input type="file" accept="image/*" multiple onChange={(e) => addPhotos(e.target.files)} />
                  <span>Carica foto</span>
                </label>
              )}
            </div>
          )}

          {tab === "programma" && (
            <div className="stack">
              {config.sections.map((s) => (
                <div key={s.id} className="card-edit">
                  <input aria-label="Titolo sezione" value={s.title} onChange={(e) => updateSection(s.id, "title", e.target.value)} />
                  <textarea aria-label="Testo sezione" rows={2} value={s.body} onChange={(e) => updateSection(s.id, "body", e.target.value)} />
                  <button type="button" className="ghost" onClick={() => patch({ sections: config.sections.filter((x) => x.id !== s.id) })}>Rimuovi</button>
                </div>
              ))}
              <button type="button" className="ghost" onClick={addSection} disabled={config.sections.length >= 5}>+ Aggiungi sezione</button>
            </div>
          )}

          {tab === "rsvp" && (
            <div className="stack">
              {config.rsvpQuestions.map((q) => (
                <div key={q.id} className="card-edit row">
                  <input aria-label="Domanda" value={q.label} onChange={(e) => updateQuestion(q.id, "label", e.target.value)} />
                  <select aria-label="Tipo risposta" value={q.type} onChange={(e) => updateQuestion(q.id, "type", e.target.value)}>
                    <option value="yes-no">Sì / No</option>
                    <option value="number">Numero</option>
                    <option value="text">Testo</option>
                  </select>
                  <button type="button" className="ghost" aria-label="Rimuovi domanda" onClick={() => patch({ rsvpQuestions: config.rsvpQuestions.filter((x) => x.id !== q.id) })}>×</button>
                </div>
              ))}
              <button type="button" className="ghost" onClick={addQuestion} disabled={config.rsvpQuestions.length >= 6}>+ Aggiungi domanda</button>
            </div>
          )}

          {tab === "extra" && (
            <div className="stack">
              {(Object.keys(PRICING.addons) as AddonKey[]).map((key) => {
                const on = config.addons.includes(key);
                return (
                  <button key={key} type="button" className={on ? "addon on" : "addon"} aria-pressed={on} onClick={() => toggleAddon(key)}>
                    <span>{PRICING.addons[key].label}</span>
                    <strong>+{formatPrice(PRICING.addons[key].cents)}</strong>
                  </button>
                );
              })}
            </div>
          )}
        </fieldset>

        {error && <p role="alert" className="error">{error}</p>}

        <footer className="checkout">
          {status === "paid" ? (
            <div className="shared">
              <p>Invito attivo. Condividilo con i tuoi ospiti:</p>
              <code>{shareUrl}</code>
              <a className="btn" href={waLink} target="_blank" rel="noreferrer">Condividi su WhatsApp</a>
            </div>
          ) : (
            <>
              <div className="total">
                <span>Totale</span>
                <strong>{formatPrice(total)}</strong>
              </div>
              <button type="button" className="btn primary" disabled={checkingOut} onClick={checkout}>
                {checkingOut ? "Apro il pagamento…" : "Procedi al pagamento"}
              </button>
            </>
          )}
        </footer>
      </aside>

      <section className="preview" aria-label="Anteprima in tempo reale">
        <div className="device">
          <div className="scroll">
            <Invitation config={config} />
          </div>
        </div>
        <p className="preview-note">Anteprima in tempo reale · {template.name}</p>
      </section>
    </div>
  );
}

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={wide ? "field wide" : "field"}>
      <span>{label}</span>
      {children}
    </label>
  );
}
