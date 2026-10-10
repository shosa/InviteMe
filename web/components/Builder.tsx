"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { EVENT_TYPES, activeFeatures, formatPrice, getModel, getStyle, maxPhotos, totalCents, type AddonKey, type Catalog, type EventType, type InviteConfig, type RsvpQuestion } from "@inviteme/shared";
import { Invitation } from "./Invitation";
import { toast } from "sonner";
import { ArrowLeft, Copy, Upload } from "lucide-react";
import { Switch } from "./ui/Switch";
import { Accordion } from "./ui/Accordion";

type Tab = "testi" | "stile" | "foto" | "programma" | "conferma" | "musica" | "funzioni" | "ospiti";

export type Manage = {
  id: string;
  slug: string;
  status: "draft" | "paid";
  config: InviteConfig;
  guests: { email: string; sentAt: string }[];
  catalog: Catalog;
};

type RsvpSummary = {
  total: number;
  attending: number;
  declined: number;
  guests: number;
  questions: RsvpQuestion[];
  rsvps: { id: string; createdAt: string; answers: Record<string, string | number | boolean> }[];
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

export function Builder({ initial }: { initial: Manage }) {
  const catalog = initial.catalog;
  const [config, setConfig] = useState<InviteConfig>(initial.config);
  const [status, setStatus] = useState(initial.status);
  const [guests, setGuests] = useState(initial.guests);
  const [tab, setTab] = useState<Tab>("testi");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const firstRun = useRef(true);
  const locked = status === "paid";

  const model = getModel(catalog, config.model);
  const style = getStyle(catalog, config.styleId);
  const features = useMemo(() => [...activeFeatures(catalog, config.model, config.addons)] as AddonKey[], [catalog, config.model, config.addons]);
  const has = (k: AddonKey) => features.includes(k);
  const total = useMemo(() => totalCents(catalog, config.model, config.addons), [catalog, config.model, config.addons]);
  const photosMax = maxPhotos(catalog, config.model, config.addons);
  const purchasable = (model?.options ?? []).map((k) => catalog.addons.find((a) => a.key === k)).filter((a): a is NonNullable<typeof a> => !!a);

  const tabs = useMemo<{ id: Tab; label: string }[]>(() => {
    const list: { id: Tab; label: string }[] = [
      { id: "testi", label: "Testi" },
      { id: "stile", label: "Stile" },
      { id: "foto", label: "Foto" },
    ];
    if (has("program")) list.push({ id: "programma", label: "Programma" });
    if (has("rsvp")) list.push({ id: "conferma", label: "Conferma" });
    if (has("music")) list.push({ id: "musica", label: "Musica" });
    list.push({ id: "funzioni", label: "Funzioni" });
    list.push({ id: "ospiti", label: "Ospiti" });
    return list;
  }, [features]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setOrigin(window.location.origin), []);

  // Se una funzione viene disattivata, la sua scheda sparisce: torniamo alla prima disponibile.
  useEffect(() => {
    if (!tabs.some((t) => t.id === tab)) setTab("testi");
  }, [tabs, tab]);

  // Autosalvataggio con debounce: nessun pulsante "salva", le modifiche sono già nel database.
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

  const shareUrl = `${origin}/i/${initial.slug}`;

  function patch(p: Partial<InviteConfig>) {
    setConfig((c) => ({ ...c, ...p }));
  }
  function toggleAddon(key: AddonKey) {
    setConfig((c) => ({ ...c, addons: c.addons.includes(key) ? c.addons.filter((k) => k !== key) : [...c.addons, key] }));
  }
  async function addPhotos(e: ChangeEvent<HTMLInputElement>) {
    const room = photosMax - config.photos.length;
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

  const trackOf = (id?: string) => catalog.music.find((t) => t.id === id);

  return (
    <div className="builder">
      <aside className="builder-panel" aria-label="Configuratore">
        <header className="builder-head">
          <a href="/account" className="back-link"><ArrowLeft size={16} aria-hidden="true" />I miei inviti</a>
          <span className={`save save-${saveState}`} aria-live="polite">
            {locked ? "Pagato" : saveState === "saving" ? "Salvataggio…" : saveState === "error" ? "Non salvato" : "Salvato"}
          </span>
        </header>
        <div className="builder-title">
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
            <GuestsPanel invitationId={initial.id} paid={locked} hasRsvp={has("rsvp")} guests={guests} onSent={(sent) => setGuests((g) => [...g, ...sent.map((email) => ({ email, sentAt: new Date().toISOString() }))])} />
          ) : (
            <fieldset disabled={locked} className="pane-fields">
              {tab === "testi" && (
                <div className="stack-lg">
                  <Accordion title="Evento" summary={config.title || undefined} defaultOpen>
                    <div className="grid">
                      <Field label="Tipo di evento">
                        <select value={config.eventType} onChange={(e) => patch({ eventType: e.target.value as EventType })}>
                          {EVENT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </select>
                      </Field>
                      <Field label="Titolo"><input value={config.title} maxLength={80} onChange={(e) => patch({ title: e.target.value })} /></Field>
                      <Field label="Chi invita" wide><input value={config.hosts} maxLength={80} onChange={(e) => patch({ hosts: e.target.value })} /></Field>
                    </div>
                  </Accordion>
                  <Accordion title="Data e luogo" summary={config.eventDate ? `${config.eventDate} · ${config.venue}` : undefined}>
                    <div className="grid">
                      <Field label="Data"><input type="date" value={config.eventDate} onChange={(e) => patch({ eventDate: e.target.value })} /></Field>
                      <Field label="Ora"><input type="time" value={config.eventTime} onChange={(e) => patch({ eventTime: e.target.value })} /></Field>
                      <Field label="Luogo"><input value={config.venue} maxLength={120} onChange={(e) => patch({ venue: e.target.value })} /></Field>
                      <Field label="Indirizzo" wide><input value={config.address} maxLength={200} onChange={(e) => patch({ address: e.target.value })} /></Field>
                    </div>
                  </Accordion>
                  <Accordion title="Messaggio" summary={config.message ? config.message.slice(0, 40) : undefined}>
                    <Field label="Testo di apertura" wide>
                      <textarea rows={3} maxLength={500} value={config.message} onChange={(e) => patch({ message: e.target.value })} />
                    </Field>
                  </Accordion>
                </div>
              )}

              {tab === "stile" && (
                <div className="stack">
                  <p className="hint">Lo stile cambia colori e tipografia. Il contenuto resta lo stesso.</p>
                  <div className="style-grid" role="radiogroup" aria-label="Stile">
                    {catalog.styles.filter((s) => s.enabled).map((s) => (
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
                  <p className="hint">Fino a {photosMax} foto. La prima compare nell&apos;arco in cima all&apos;invito.</p>
                  <div className="thumbs">
                    {config.photos.map((src, i) => (
                      <div key={i} className="thumb">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`Foto ${i + 1}`} />
                        <button type="button" aria-label={`Rimuovi foto ${i + 1}`} onClick={() => patch({ photos: config.photos.filter((_, j) => j !== i) })}>×</button>
                      </div>
                    ))}
                  </div>
                  {config.photos.length < photosMax && (
                    <label className="upload">
                      <input type="file" accept="image/*" multiple onChange={addPhotos} />
                      <span className="upload-inner"><Upload size={18} aria-hidden="true" />Carica foto</span>
                    </label>
                  )}
                </div>
              )}

              {tab === "programma" && (
                <div className="stack">
                  <p className="hint">Per la timeline scrivi una riga per voce, nel formato <b>19:30 - Cerimonia</b>.</p>
                  {config.sections.map((s) => (
                    <Accordion key={s.id} title={s.title || "Voce"} summary={s.body.slice(0, 40)} className="card-edit-acc">
                      <input aria-label="Titolo sezione" value={s.title} maxLength={80} onChange={(e) => updateSection(s.id, "title", e.target.value)} />
                      <textarea aria-label="Testo sezione" rows={4} maxLength={600} value={s.body} onChange={(e) => updateSection(s.id, "body", e.target.value)} />
                      <button type="button" className="link" onClick={() => patch({ sections: config.sections.filter((x) => x.id !== s.id) })}>Rimuovi</button>
                    </Accordion>
                  ))}
                  <button type="button" className="btn outline" disabled={config.sections.length >= 5} onClick={() => patch({ sections: [...config.sections, { id: crypto.randomUUID(), title: "Nuova sezione", body: "19:00 - Inizio" }] })}>
                    Aggiungi sezione
                  </button>
                </div>
              )}

              {tab === "conferma" && (
                <div className="stack">
                  <p className="hint">Le domande compaiono nel modulo di conferma. Per le scelte multiple inserisci le opzioni separate da virgola.</p>
                  {config.rsvpQuestions.map((q) => (
                    <Accordion key={q.id} title={q.label || "Domanda"} summary={q.type === "yes-no" ? "Sì / No" : q.type === "choice" ? "Scelta multipla" : q.type === "number" ? "Numero" : "Testo libero"} className="card-edit-acc">
                      <div className="row">
                        <input aria-label="Domanda" value={q.label} maxLength={160} onChange={(e) => updateQuestion(q.id, "label", e.target.value)} />
                        <select aria-label="Tipo di risposta" value={q.type} onChange={(e) => updateQuestion(q.id, "type", e.target.value)}>
                          <option value="yes-no">Sì / No</option>
                          <option value="choice">Scelta multipla</option>
                          <option value="number">Numero</option>
                          <option value="text">Testo libero</option>
                        </select>
                        <button type="button" className="link" aria-label="Rimuovi domanda" onClick={() => patch({ rsvpQuestions: config.rsvpQuestions.filter((x) => x.id !== q.id) })}>×</button>
                      </div>
                      {q.type === "choice" && (
                        <input aria-label="Opzioni" placeholder="Sì, No, Ti dirò più tardi" value={(q.options ?? []).join(", ")} onChange={(e) => patch({ rsvpQuestions: config.rsvpQuestions.map((x) => (x.id === q.id ? { ...x, options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) } : x)) })} />
                      )}
                    </Accordion>
                  ))}
                  <button type="button" className="btn outline" disabled={config.rsvpQuestions.length >= 8} onClick={() => patch({ rsvpQuestions: [...config.rsvpQuestions, { id: crypto.randomUUID(), label: "Nuova domanda", type: "text" }] })}>
                    Aggiungi domanda
                  </button>
                </div>
              )}

              {tab === "musica" && (
                <div className="stack">
                  <p className="hint">Scegli un brano dalla libreria InviteMe, oppure incolla un link tuo di cui hai i diritti.</p>
                  <div className="tracks" role="radiogroup" aria-label="Brano">
                    <label className={`track${!config.musicTrackId ? " is-on" : ""}`}>
                      <input type="radio" name="track" checked={!config.musicTrackId} onChange={() => patch({ musicTrackId: undefined })} />
                      <span><b>Nessun brano dalla libreria</b><small>usa il link personale qui sotto</small></span>
                    </label>
                    {catalog.music.map((t) => (
                      <label key={t.id} className={`track${config.musicTrackId === t.id ? " is-on" : ""}`}>
                        <input type="radio" name="track" checked={config.musicTrackId === t.id} onChange={() => patch({ musicTrackId: t.id, musicUrl: undefined })} />
                        <span><b>{t.title}</b><small>{t.artist || "Libreria InviteMe"}</small></span>
                        <audio controls preload="none" src={t.url} />
                      </label>
                    ))}
                    {catalog.music.length === 0 && <p className="hint">La libreria è vuota: l&apos;amministratore non ha ancora caricato brani.</p>}
                  </div>
                  <Field label="Link personale (https)" wide>
                    <input type="url" placeholder="https://…/brano.mp3" disabled={!!config.musicTrackId} value={config.musicUrl ?? ""} onChange={(e) => patch({ musicUrl: e.target.value.trim() || undefined })} />
                  </Field>
                  {trackOf(config.musicTrackId) && <p className="hint">Brano selezionato: {trackOf(config.musicTrackId)?.title}</p>}
                </div>
              )}

              {tab === "funzioni" && (
                <div className="stack">
                  <p className="hint">Ogni funzione ha un prezzo fisso. Il totale aggiornato è in basso.</p>
                  {purchasable.map((a) => {
                    const on = config.addons.includes(a.key);
                    return (
                      <div key={a.key} className={on ? "addon-row is-on" : "addon-row"}><div className="addon-text"><b>{a.label}</b><small>{a.description}</small></div><strong>+{formatPrice(a.cents)}</strong><Switch checked={on} onChange={() => toggleAddon(a.key)} ariaLabel={a.label} /></div>
                    );
                  })}
                  {model && model.included.length > 0 && (
                    <p className="hint">Incluse nel modello: {model.included.map((k) => catalog.addons.find((a) => a.key === k)?.label ?? k).join(", ")}.</p>
                  )}
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
                <button type="button" className="btn outline small" onClick={() => { navigator.clipboard?.writeText(shareUrl); toast.success("Link copiato"); }}><Copy size={16} aria-hidden="true" />Copia</button>
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
                  <small>{model?.name}{config.addons.length ? ` · ${config.addons.length} funzioni` : ""}</small>
                </div>
                <strong>{formatPrice(total)}</strong>
              </div>
              <button type="button" className="btn solid wide" disabled={checkingOut} onClick={checkout}>
                {checkingOut ? "Apro il pagamento…" : "Procedi al pagamento"}
              </button>
              <p className="fine">Pagamento sicuro. Nessun abbonamento. Dopo il pagamento l&apos;invito non è più modificabile.</p>
            </>
          )}
        </footer>
      </aside>

      <section className="preview" aria-label="Anteprima in tempo reale">
        <p className="preview-label">Anteprima · {style.name}</p>
        <div className="preview-frame">
          <Invitation config={config} style={style} features={features} />
        </div>
      </section>
    </div>
  );
}

function GuestsPanel({ invitationId, paid, hasRsvp, guests, onSent }: { invitationId: string; paid: boolean; hasRsvp: boolean; guests: { email: string; sentAt: string }[]; onSent: (emails: string[]) => void }) {
  const [summary, setSummary] = useState<RsvpSummary | null>(null);
  const [emails, setEmails] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (!hasRsvp || !paid) return;
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
  }, [hasRsvp, paid, invitationId]);

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

  if (!paid) return <p className="hint">Dopo il pagamento potrai inviare il link agli ospiti e seguire le risposte qui.</p>;

  return (
    <div className="stack">
      <section className="block">
        <h3>Invia agli ospiti</h3>
        <p className="hint">Un solo link per tutti. Indirizzi separati da virgola o da una riga.</p>
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
                <p className="hint">Ancora nessuna risposta: compariranno qui in tempo reale.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Ricevuta</th>{summary.questions.map((q) => <th key={q.id}>{q.label}</th>)}</tr></thead>
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
