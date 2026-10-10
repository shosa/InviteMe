"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Invitation } from "./Invitation";
import { EVENT_TYPES, MODELS, PRICING, STYLES, formatPrice, type AddonKey, type EventType } from "@/lib/catalog";
import { totalCents } from "@/lib/pricing";
import type { InviteConfig, RsvpQuestion } from "@/lib/invitation";

type Tab = "testi" | "stile" | "foto" | "programma" | "conferma" | "extra" | "ospiti";

type RsvpSummary = {
  total: number;
  attending: number;
  declined: number;
  guests: number;
  questions: RsvpQuestion[];
  rsvps: { id: string; createdAt: string; answers: Record<string, string | number | boolean> }[];
};

type Props = {
  initial: { id: string; slug: string; config: InviteConfig; status: "draft" | "paid"; guests: { email: string; sentAt: string }[] };
};

// Riduce la foto a max 1400 px in JPEG: resta leggera nel database e nella pagina pubblica.
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1400 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.86));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Immagine non leggibile"));
    };
    img.src = url;
  });
}

export function Builder({ initial }: Props) {
  const [config, setConfig] = useState<InviteConfig>(initial.config);
  const [status, setStatus] = useState<"draft" | "paid">(initial.status);
  const [guests, setGuests] = useState(initial.guests);
  const [tab, setTab] = useState<Tab>("testi");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const firstRun = useRef(true);
  const locked = status === "paid";

  const model = MODELS.find((m) => m.id === config.model) ?? MODELS[1];
  const hasRsvp = model.hasRsvp;
  const tabs = useMemo<{ id: Tab; label: string }[]>(
    () => [
      { id: "testi", label: "Testi" },
      { id: "stile", label: "Stile" },
      { id: "foto", label: "Foto" },
      ...(hasRsvp ? [{ id: "programma" as Tab, label: "Programma" }, { id: "conferma" as Tab, label: "Conferma presenza" }] : []),
      { id: "extra", label: "Extra" },
      { id: "ospiti", label: "Ospiti" },
    ],
    [hasRsvp],
  );

  useEffect(() => setOrigin(window.location.origin), []);

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
        if (res.ok) {
          setSaveState("saved");
          setError(null);
        } else {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setSaveState("error");
          setError(data.error ?? "Salvataggio non riuscito");
        }
      } catch {
        setSaveState("error");
        setError("Connessione assente: le modifiche non sono state salvate.");
      }
    }, 600);
    return () => clearTimeout(t);
  }, [config, initial.id, locked]);

  const total = useMemo(() => totalCents(config.model, config.addons), [config.model, config.addons]);
  const shareUrl = `${origin}/i/${initial.slug}`;

  function patch(p: Partial<InviteConfig>) {
    setConfig((c) => ({ ...c, ...p }));
  }
  function toggleAddon(key: AddonKey) {
    setConfig((c) => ({ ...c, addons: c.addons.includes(key) ? c.addons.filter((k) => k !== key) : [...c.addons, key] }));
  }
  async function addPhotos(e: ChangeEvent<HTMLInputElement>) {
    const room = 3 - config.photos.length;
    const picked = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/")).slice(0, Math.max(0, room));
    e.target.value = "";
    if (picked.length === 0) return;
    try {
      const urls = await Promise.all(picked.map(compressImage));
      patch({ photos: [...config.photos, ...urls] });
    } catch {
      setError("Una delle immagini non si può leggere. Prova con un altro file.");
    }
  }
  function updateSection(id: string, field: "title" | "body", value: string) {
    patch({ sections: config.sections.map((s) => (s.id === id ? { ...s, [field]: value } : s)) });
  }
  function updateQuestion(id: string, field: keyof RsvpQuestion, value: string) {
    patch({ rsvpQuestions: config.rsvpQuestions.map((q) => (q.id === id ? { ...q, [field]: value } : q)) });
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
      if (!res.ok || !data.checkoutUrl) throw new Error(data.error ?? "Pagamento non disponibile");
      window.location.href = data.checkoutUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore imprevisto");
      setCheckingOut(false);
    }
  }

  const styleName = STYLES.find((s) => s.id === config.styleId)?.name ?? "";

  return (
    <div className="builder">
      <aside className="builder-panel" aria-label="Configuratore">
        <header className="builder-head">
          <a href="/account" className="back-link">← I miei inviti</a>
          <span className={`save save-${saveState}`} aria-live="polite">
            {locked ? "Pagato" : saveState === "saving" ? "Salvataggio…" : saveState === "error" ? "Non salvato" : "Salvato"}
          </span>
        </header>
        <div className="builder-title">
          <p className="eyebrow">{model.name}</p>
          <h1>{config.title || "Il tuo invito"}</h1>
        </div>

        <nav className="tabs" role="tablist" aria-label="Sezioni">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "tab is-on" : "tab"} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>

        <div className="pane">
          {tab === "ospiti" ? (
            <GuestsPanel
              invitationId={initial.id}
              paid={locked}
              hasRsvp={hasRsvp}
              guests={guests}
              onSent={(sent) => setGuests((g) => [...g, ...sent.map((email) => ({ email, sentAt: new Date().toISOString() }))])}
            />
          ) : (
          <fieldset disabled={locked} className="pane-fields">
            {tab === "testi" && (
              <div className="grid">
                <Field label="Tipo di evento">
                  <select value={config.eventType} onChange={(e) => patch({ eventType: e.target.value as EventType })}>
                    {EVENT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </Field>
                <Field label="Titolo"><input value={config.title} maxLength={80} onChange={(e) => patch({ title: e.target.value })} /></Field>
                <Field label="Chi invita"><input value={config.hosts} maxLength={80} onChange={(e) => patch({ hosts: e.target.value })} /></Field>
                <Field label="Data"><input type="date" value={config.eventDate} onChange={(e) => patch({ eventDate: e.target.value })} /></Field>
                <Field label="Ora"><input type="time" value={config.eventTime} onChange={(e) => patch({ eventTime: e.target.value })} /></Field>
                <Field label="Luogo"><input value={config.venue} maxLength={120} onChange={(e) => patch({ venue: e.target.value })} /></Field>
                <Field label="Indirizzo" wide><input value={config.address} maxLength={200} onChange={(e) => patch({ address: e.target.value })} /></Field>
                <Field label="Messaggio" wide>
                  <textarea rows={3} maxLength={500} value={config.message} onChange={(e) => patch({ message: e.target.value })} />
                </Field>
              </div>
            )}

            {tab === "stile" && (
              <div className="stack">
                <p className="hint">Lo stile cambia colori e tipografia. Il contenuto resta lo stesso.</p>
                <div className="style-grid" role="radiogroup" aria-label="Stile">
                  {STYLES.map((s) => (
                    <label key={s.id} className={`style-card${config.styleId === s.id ? " is-on" : ""}`} style={{ background: s.bg, color: s.ink }}>
                      <input type="radio" name="style" value={s.id} checked={config.styleId === s.id} onChange={() => patch({ styleId: s.id })} />
                      <span className="style-accent" style={{ background: s.accent }} aria-hidden />
                      <span className={s.font === "serif" ? "style-name serif" : "style-name sans"}>{s.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {tab === "foto" && (
              <div className="stack">
                <p className="hint">Fino a 3 foto. La prima compare nella forma ad arco in cima all&apos;invito.</p>
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
                    <input type="file" accept="image/*" multiple onChange={addPhotos} />
                    <span>Carica foto</span>
                  </label>
                )}
              </div>
            )}

            {tab === "programma" && hasRsvp && (
              <div className="stack">
                {config.sections.map((s) => (
                  <div key={s.id} className="card-edit">
                    <input aria-label="Titolo sezione" value={s.title} maxLength={80} onChange={(e) => updateSection(s.id, "title", e.target.value)} />
                    <textarea aria-label="Testo sezione" rows={2} maxLength={600} value={s.body} onChange={(e) => updateSection(s.id, "body", e.target.value)} />
                    <button type="button" className="link" onClick={() => patch({ sections: config.sections.filter((x) => x.id !== s.id) })}>Rimuovi</button>
                  </div>
                ))}
                <button type="button" className="btn outline" disabled={config.sections.length >= 5} onClick={() => patch({ sections: [...config.sections, { id: crypto.randomUUID(), title: "Nuova voce", body: "Scrivi qui il dettaglio." }] })}>
                  Aggiungi voce al programma
                </button>
              </div>
            )}

            {tab === "conferma" && hasRsvp && (
              <div className="stack">
                <p className="hint">Queste domande compaiono nel modulo di conferma. Le prime due (presenza e numero di persone) sono consigliate.</p>
                {config.rsvpQuestions.map((q) => (
                  <div key={q.id} className="card-edit row">
                    <input aria-label="Domanda" value={q.label} maxLength={160} onChange={(e) => updateQuestion(q.id, "label", e.target.value)} />
                    <select aria-label="Tipo di risposta" value={q.type} onChange={(e) => updateQuestion(q.id, "type", e.target.value)}>
                      <option value="yes-no">Sì / No</option>
                      <option value="number">Numero</option>
                      <option value="text">Testo libero</option>
                    </select>
                    <button type="button" className="link" aria-label="Rimuovi domanda" onClick={() => patch({ rsvpQuestions: config.rsvpQuestions.filter((x) => x.id !== q.id) })}>×</button>
                  </div>
                ))}
                <button type="button" className="btn outline" disabled={config.rsvpQuestions.length >= 6} onClick={() => patch({ rsvpQuestions: [...config.rsvpQuestions, { id: crypto.randomUUID(), label: "Nuova domanda", type: "text" }] })}>
                  Aggiungi domanda
                </button>
              </div>
            )}

            {tab === "extra" && (
              <div className="stack">
                {(Object.keys(PRICING.addons) as AddonKey[]).map((key) => {
                  const on = config.addons.includes(key);
                  return (
                    <button key={key} type="button" className={on ? "addon is-on" : "addon"} aria-pressed={on} onClick={() => toggleAddon(key)}>
                      <span>{PRICING.addons[key].label}</span>
                      <strong>+{formatPrice(PRICING.addons[key].cents)}</strong>
                    </button>
                  );
                })}
                {config.addons.includes("music") && (
                  <Field label="Link audio (https, MP3 o M4A)" wide>
                    <input type="url" placeholder="https://…/brano.mp3" value={config.musicUrl ?? ""} onChange={(e) => patch({ musicUrl: e.target.value.trim() || undefined })} />
                  </Field>
                )}
                {config.addons.includes("map") && <p className="hint">La mappa usa luogo e indirizzo della tab Testi.</p>}
              </div>
            )}
          </fieldset>
          )}
        </div>

        {error && <p role="alert" className="form-error panel-error">{error}</p>}

        <footer className="checkout">
          {locked ? (
            <div className="shared">
              <p className="shared-label">Il tuo invito è attivo</p>
              <div className="shared-link">
                <code>{shareUrl}</code>
                <button type="button" className="btn outline small" onClick={() => navigator.clipboard?.writeText(shareUrl)}>Copia</button>
              </div>
              <a className="btn solid wide" href={`https://wa.me/?text=${encodeURIComponent(`Ti invitiamo! Trovi tutti i dettagli qui: ${shareUrl}`)}`} target="_blank" rel="noreferrer">
                Condividi su WhatsApp
              </a>
            </div>
          ) : (
            <>
              <div className="total">
                <div>
                  <span>Totale, pagamento unico</span>
                  <small>{model.name}{config.addons.length ? ` + ${config.addons.length} extra` : ""}</small>
                </div>
                <strong>{formatPrice(total)}</strong>
              </div>
              <button type="button" className="btn solid wide" disabled={checkingOut} onClick={checkout}>
                {checkingOut ? "Apro il pagamento…" : "Procedi al pagamento"}
              </button>
              <p className="fine">Pagamento sicuro. Nessun abbonamento. Le modifiche sono bloccate dopo il pagamento.</p>
            </>
          )}
        </footer>
      </aside>

      <section className="preview" aria-label="Anteprima in tempo reale">
        <p className="preview-label">Anteprima · stile {styleName}</p>
        <div className="preview-frame">
          <Invitation config={config} />
        </div>
      </section>
    </div>
  );
}

function GuestsPanel({ invitationId, paid, hasRsvp, guests, onSent }: {
  invitationId: string;
  paid: boolean;
  hasRsvp: boolean;
  guests: { email: string; sentAt: string }[];
  onSent: (emails: string[]) => void;
}) {
  const [summary, setSummary] = useState<RsvpSummary | null>(null);
  const [emails, setEmails] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (!hasRsvp) return;
    let alive = true;
    const load = () =>
      fetch(`/api/invitations/${invitationId}/rsvps`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d: RsvpSummary | null) => alive && d && setSummary(d))
        .catch(() => undefined);
    load();
    const id = setInterval(load, 8000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [hasRsvp, invitationId]);

  async function send() {
    const list = emails.split(/[\s,;]+/).filter(Boolean);
    setSending(true);
    setResult(null);
    try {
      const res = await fetch(`/api/invitations/${invitationId}/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: list, message: note || undefined }),
      });
      const data = (await res.json()) as { sent?: number; failed?: string[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Invio non riuscito");
      setResult(`Inviati: ${data.sent}${data.failed?.length ? ` · non riusciti: ${data.failed.length}` : ""}`);
      onSent(list.filter((e) => !data.failed?.includes(e)));
      setEmails("");
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Errore");
    } finally {
      setSending(false);
    }
  }

  if (!paid) {
    return <p className="hint">Dopo il pagamento potrai inviare il link agli ospiti via email e seguire le risposte qui.</p>;
  }

  return (
    <div className="stack">
      <section className="block">
        <h3>Invia agli ospiti</h3>
        <p className="hint">Un solo link per tutti. Inserisci gli indirizzi separati da virgola o da una riga.</p>
        <label className="field wide">
          <span>Indirizzi email</span>
          <textarea rows={4} value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="mario@esempio.it, giulia@esempio.it" />
        </label>
        <label className="field wide">
          <span>Messaggio personale (facoltativo)</span>
          <textarea rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button type="button" className="btn solid" disabled={sending || !emails.trim()} onClick={send}>
          {sending ? "Invio in corso…" : "Invia gli inviti"}
        </button>
        {result && <p className="form-notice">{result}</p>}
        {guests.length > 0 && <p className="hint">Inviti già spediti: {guests.length}</p>}
      </section>

      {hasRsvp && (
        <section className="block">
          <h3>Conferme di presenza</h3>
          {!summary ? (
            <p className="hint">Caricamento…</p>
          ) : (
            <>
              <div className="sum">
                <div><span>Risposte</span><strong>{summary.total}</strong></div>
                <div><span>Presenti</span><strong>{summary.attending}</strong></div>
                <div><span>Persone</span><strong>{summary.guests}</strong></div>
              </div>
              <a className="btn outline small" href={`/api/invitations/${invitationId}/rsvps?format=csv`}>Scarica CSV</a>
              {summary.rsvps.length === 0 ? (
                <p className="hint">Ancora nessuna risposta. Compariranno qui in tempo reale.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Ricevuta</th>
                        {summary.questions.map((q) => <th key={q.id}>{q.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {summary.rsvps.map((r) => (
                        <tr key={r.id}>
                          <td>{new Date(r.createdAt).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })}</td>
                          {summary.questions.map((q) => {
                            const a = r.answers[q.id];
                            return <td key={q.id}>{q.type === "yes-no" ? (a === true ? "Sì" : a === false ? "No" : "–") : String(a ?? "–")}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      )}
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
