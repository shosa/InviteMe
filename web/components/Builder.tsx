"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  activeFeatures,
  enabledThemes,
  formatPrice,
  getModel,
  makeBlock,
  newBlockId,
  totalCents,
  type AddonKey,
  type BlockInstance,
  type BlockType,
  type Catalog,
  type EventType,
  type InviteConfig,
  type RsvpQuestion,
  blockDef,
  isFixedPosition,
} from "@inviteme/shared";
import { toast } from "sonner";
import { ArrowLeft, Copy, Eye, Monitor, Redo2, Smartphone, Undo2, Users } from "lucide-react";
import { Canvas } from "./builder/Canvas";
import { Inspector } from "./builder/Inspector";
import { GuestsPanel } from "./builder/guests";
import { useHistory } from "./builder/history";
import { parseFragments } from "@/lib/blockFragments";
import { ui, type Lang } from "@/lib/ui";
import { modelCopy, themeCopy } from "@/lib/catalogCopy";
import { StockContext } from "./builder/PixabayDialog";

export type Manage = {
  id: string;
  slug: string;
  status: "draft" | "paid";
  config: InviteConfig;
  guests: { email: string; sentAt: string }[];
  editCount: number;
  editSession: string | null;
  catalog: Catalog;
};

type MobileTab = "blocchi" | "anteprima" | "proprieta";
type Device = "desktop" | "mobile";
type Save = "saved" | "saving" | "error";

// Editor dell'invito: palette e struttura a sinistra, anteprima reale al centro, proprietà a destra.
// Blocchi che si aggiornano da soli nell'anteprima: tutti tranne la busta e la musica, che hanno stato globale della pagina.
const PATCHABLE = new Set(["hero", "message", "program", "venue", "map", "transfer", "dresscode", "footer", "date", "gallery", "countdown", "scratchdate", "video", "rsvp"]);

// Tutto ciò che, cambiando, rende la pagina diversa nel suo insieme: se cambia uno di questi, l'anteprima si ricarica.
function pageKey(c: InviteConfig, envelopeOn: boolean): string {
  return JSON.stringify({
    t: c.themeId, m: c.model, a: [...c.addons].sort(), l: c.locale, e: c.eventType, q: c.rsvpQuestions, env: envelopeOn, bg: c.background ?? null,
    ids: c.blocks.map((b) => `${b.id}:${b.type}:${b.hidden ? 1 : 0}`),
  });
}

// L'invito aperto è disponibile a tutto l'editor (ricerca foto Pixabay nei campi).
export function Builder({ initial, lang = "it" }: { initial: Manage; lang?: Lang }) {
  return (
    <StockContext.Provider value={initial.id}>
      <BuilderEditor initial={initial} lang={lang} />
    </StockContext.Provider>
  );
}

function BuilderEditor({ initial, lang }: { initial: Manage; lang: Lang }) {
  const L = ui(lang).builder;
  const catalog = initial.catalog;
  const history = useHistory<InviteConfig>(initial.config);
  const config = history.present;
  // Dopo l'acquisto l'invito si modifica finché non si conferma la modifica: poi è chiuso.
  const locked = initial.status === "paid" && initial.editCount >= 1;
  const editable = !locked;
  async function confirmEdit() {
    const res = await fetch(`/api/invitations/${initial.id}/confirm-edit`, { method: "POST" });
    if (res.ok) window.location.reload();
    else setError("Conferma non riuscita, riprova.");
  }

  const [selected, setSelected] = useState<string | null>(null);
  const [panel, setPanel] = useState<"proprieta" | "ospiti">("proprieta");
  const [device, setDevice] = useState<Device>("mobile");
  const [mobileTab, setMobileTab] = useState<MobileTab>("anteprima");
  const [save, setSave] = useState<Save>("saved");
  const [preview, setPreview] = useState("");
  const [previewState, setPreviewState] = useState<"ready" | "loading" | "error">("loading");
  // Ricaricamento completo dell'anteprima: la pagina vecchia resta sfocata con lo spinner finché la nuova non è caricata.
  const [refreshing, setRefreshing] = useState(false);
  function swapPreview(html: string) {
    setRefreshing(true);
    setPreview(html);
    // Sicurezza: se il documento non cambia (stesso HTML) l'evento di caricamento non arriva, quindi si rimette a fuoco comunque.
    window.setTimeout(() => setRefreshing(false), 3000);
  }
  const [busy, setBusy] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [guests, setGuests] = useState(initial.guests);
  const [firstSave, setFirstSave] = useState(true);
  const [showCover, setShowCover] = useState(false);
  // La busta si vede in anteprima quando è selezionata, oppure con l'interruttore «Mostra la busta».
  const hasCover = config.blocks.some((b) => b.type === "cover");
  const envelopeOn = hasCover && (showCover || selected !== null && config.blocks.some((b) => b.id === selected && b.type === "cover"));
  const [hover, setHover] = useState<string | null>(null);
  const [scroll, setScroll] = useState({ y: 0, max: 0 });
  const frame = useRef<HTMLIFrameElement>(null);
  const scrollY = useRef(0);

  const model = getModel(catalog, config.model);
  const theme = catalog.themes.find((t) => t.manifest.id === config.themeId)?.manifest;
  const features = useMemo(() => new Set(activeFeatures(catalog, config.model, config.addons) as Set<AddonKey>), [catalog, config.model, config.addons]);
  const total = useMemo(() => totalCents(catalog, config.model, config.addons), [catalog, config.model, config.addons]);
  // Quanto è già stato pagato: il prezzo compare dopo l'acquisto solo per le funzioni aggiunte e non ancora pagate.
  const paidAlready = initial.status === "paid";
  const paidTotal = useMemo(() => totalCents(catalog, initial.config.model, initial.config.addons), [catalog, initial.config]);
  const extra = paidAlready ? total - paidTotal : 0;
  const block = config.blocks.find((b) => b.id === selected) ?? null;
  const title = String(config.event.title ?? "") || L.unnamed;
  const hasRsvp = config.blocks.some((b) => b.type === "rsvp");

  useEffect(() => setOrigin(window.location.origin), []);

  // Salva la configurazione sul server: dal salvataggio automatico e dal pulsante «Salva».
  async function persist(c: InviteConfig) {
    setSave("saving");
    try {
      const res = await fetch(`/api/invitations/${initial.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) });
      if (res.ok) {
        setSave("saved");
        setError(null);
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setSave("error");
        setError(data.error ?? "Salvataggio non riuscito");
      }
    } catch {
      setSave("error");
      setError("Connessione assente: le modifiche non sono state salvate.");
    }
  }

  // Salvataggio automatico: il database riceve sempre l'ultima versione.
  useEffect(() => {
    if (firstSave) {
      setFirstSave(false);
      return;
    }
    if (locked) return;
    setSave("saving");
    const t = setTimeout(() => persist(config), 650);
    return () => clearTimeout(t);
  }, [config, initial.id, locked]); // eslint-disable-line react-hooks/exhaustive-deps

  // Selezionare un blocco (dalla lista o dall'anteprima) porta l'anteprima su quel blocco.
  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ type: "focus", id: selected }, "*");
  }, [selected]);

  // Anteprima: la pagina reale del motore, rigenerata dal server con la configurazione in corso.
  // Se è cambiato solo il contenuto di qualche blocco, si aggiornano solo quei blocchi nell'anteprima, senza ricaricarla.
  const lastRender = useRef<{ key: string; frags: Record<string, string> } | null>(null);
  useEffect(() => {
    let alive = true;
    setPreviewState("loading");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/invitations/${initial.id}/preview?cover=${envelopeOn ? 1 : 0}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config) });
        if (!alive) return;
        if (!res.ok) {
          setRefreshing(false);
          return setPreviewState("error");
        }
        const html = await res.text();
        const frags = parseFragments(html);
        const key = pageKey(config, envelopeOn);
        const prev = lastRender.current;
        const sameSkeleton = !!prev && prev.key === key && Object.keys(frags).length === Object.keys(prev.frags).length;
        if (sameSkeleton) {
          const changed = Object.keys(frags).filter((id) => frags[id] !== prev.frags[id]);
          const patchable = changed.every((id) => PATCHABLE.has(config.blocks.find((b) => b.id === id)?.type ?? ""));
          if (patchable) {
            for (const id of changed) frame.current?.contentWindow?.postMessage({ type: "patch", id, html: frags[id] }, "*");
          } else {
            swapPreview(html);
          }
        } else {
          swapPreview(html);
        }
        lastRender.current = { key, frags };
        setPreviewState("ready");
      } catch {
        if (alive) {
          setRefreshing(false);
          setPreviewState("error");
        }
      }
    }, 420);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [config, initial.id, envelopeOn]);

  // Lista e anteprima si scambiano l'evidenziazione: l'hover sull'una accende l'altra, e un click nell'anteprima seleziona il blocco.
  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ type: "highlight", id: hover }, "*");
  }, [hover, preview]);
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.source !== frame.current?.contentWindow) return;
      const d = e.data as { type?: string; id?: unknown; y?: unknown; max?: unknown } | null;
      if (d?.type === "hover") setHover(typeof d.id === "string" ? d.id : null);
      if (d?.type === "scroll" && typeof d.y === "number") {
        const y: number = d.y;
        scrollY.current = y;
        setScroll((s) => ({ ...s, y }));
      }
      if (d?.type === "max" && typeof d.max === "number") {
        const max: number = d.max;
        setScroll((s) => ({ ...s, max }));
      }
      if (d?.type === "select" && typeof d.id === "string") {
        setSelected(d.id);
        setPanel("proprieta");
        setMobileTab("proprieta");
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Annulla e ripristina dalla tastiera (Ctrl/⌘+Z e Ctrl/⌘+Shift+Z) quando non si scrive in un campo.
  useEffect(() => {
    if (locked) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement).isContentEditable) return;
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      if (e.shiftKey) history.redo();
      else history.undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [history, locked]);

  // Modifiche alla configurazione: ogni azione passa dalla cronologia.
  const edit = useCallback((next: (c: InviteConfig) => InviteConfig, group?: string) => history.set(next(config), group), [config, history]);

  // Con una funzione a pagamento da attivare, la attiva e aggiunge il blocco in un solo passo.
  function addBlock(type: BlockType, feature?: AddonKey) {
    const b = makeBlock(type, config.locale);
    const top = !!blockDef(type)?.anchored;
    edit((c) => ({ ...c, blocks: top ? [b, ...c.blocks] : [...c.blocks, b], addons: feature && !c.addons.includes(feature) ? [...c.addons, feature] : c.addons }));
    setSelected(b.id);
  }
  // Senza la funzione, i blocchi che la richiedono escono dalla struttura (annullabile con Annulla).
  function withActiveFeatures(c: InviteConfig): InviteConfig {
    const active = activeFeatures(catalog, c.model, c.addons);
    return { ...c, blocks: c.blocks.filter((b) => { const f = blockDef(b.type)?.feature; return !f || active.has(f); }) };
  }
  // Funzioni a pagamento: si attivano dalla finestra dei blocchi. Le funzioni del modello sono sempre attive.
  function toggleAddon(key: AddonKey) {
    edit((c) => withActiveFeatures({ ...c, addons: c.addons.includes(key) ? c.addons.filter((a) => a !== key) : [...c.addons, key] }));
  }
  // Cambio di modello: si tengono solo le funzioni che il nuovo modello offre, e il tema resta se è compatibile.
  function setModel(id: string) {
    edit((c) => {
      const m = getModel(catalog, id);
      const themes = enabledThemes(catalog, id);
      const themeId = themes.some((t) => t.id === c.themeId) ? c.themeId : (themes[0]?.id ?? c.themeId);
      return withActiveFeatures({ ...c, model: id, addons: c.addons.filter((a) => m?.options.includes(a)), themeId });
    });
  }
  function moveBlock(from: number, to: number) {
    edit((c) => {
      const list = [...c.blocks];
      const [moved] = list.splice(from, 1);
      list.splice(Math.max(0, Math.min(list.length, to)), 0, moved);
      // Un blocco bloccato non cambia posizione: se lo spostamento la cambierebbe, non si fa nulla.
      const fixed = (blocks: BlockInstance[]) => blocks.map((b, i) => (isFixedPosition(b.type) ? i : -1)).filter((i) => i >= 0);
      if (fixed(c.blocks).join() !== fixed(list).join()) return c;
      return { ...c, blocks: list };
    });
  }
  function duplicateBlock(id: string) {
    const src = config.blocks.find((b) => b.id === id);
    if (!src) return;
    const copy: BlockInstance = { ...src, id: newBlockId(), props: JSON.parse(JSON.stringify(src.props)) };
    const at = config.blocks.findIndex((b) => b.id === id);
    edit((c) => ({ ...c, blocks: [...c.blocks.slice(0, at + 1), copy, ...c.blocks.slice(at + 1)] }));
    setSelected(copy.id);
  }
  function toggleBlock(id: string) {
    edit((c) => ({ ...c, blocks: c.blocks.map((b) => (b.id === id ? { ...b, hidden: !b.hidden } : b)) }));
  }
  function removeBlock(id: string) {
    const target = config.blocks.find((b) => b.id === id);
    if (target && blockDef(target.type)?.locked) return;
    // Un blocco a pagamento tolto porta via anche la sua funzione, se nessun altro blocco la usa: il prezzo scende.
    const feature = target ? blockDef(target.type)?.feature : undefined;
    edit((c) => {
      const blocks = c.blocks.filter((b) => b.id !== id);
      const stillUsed = !!feature && blocks.some((b) => blockDef(b.type)?.feature === feature);
      return { ...c, blocks, addons: feature && !stillUsed ? c.addons.filter((a) => a !== feature) : c.addons };
    });
    if (selected === id) setSelected(null);
  }
  function setProp(id: string, key: string, value: unknown, group?: string) {
    edit((c) => ({ ...c, blocks: c.blocks.map((b) => (b.id === id ? { ...b, props: { ...b.props, [key]: value } } : b)) }), group);
  }
  function setEvent(key: string, value: unknown, group?: string) {
    edit((c) => ({ ...c, event: { ...c.event, [key]: value } }), group);
  }
  // Cambio di template: contenuto e blocchi restano; tornano al template solo i colori personalizzati.
  function setTheme(id: string) {
    edit((c) => ({
      ...c,
      themeId: id,
      blocks: c.blocks.map((b) => {
        const props = { ...b.props };
        delete props.lookBg;
        delete props.lookInk;
        delete props.lookCover;
        return { ...b, props };
      }),
    }));
  }

  async function upload(kind: "photo" | "video" | "audio", file: File): Promise<string | null> {
    setBusy(kind);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`/api/invitations/${initial.id}/media?kind=${kind}`, { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Caricamento non riuscito");
      return data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Caricamento non riuscito");
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function checkout() {
    setCheckingOut(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invitationId: initial.id }) });
      const data = (await res.json()) as { checkoutUrl?: string; error?: string };
      if (!res.ok || !data.checkoutUrl) throw new Error(data.error ?? "Pagamento non disponibile");
      window.location.href = data.checkoutUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore imprevisto");
      setCheckingOut(false);
    }
  }

  const shareUrl = `${origin}/i/${initial.slug}`;
  const saveLabel = locked ? L.paid : save === "saving" ? L.saving : save === "error" ? L.notSaved : L.saved;

  return (
    <div className={`bl-app is-${device} is-tab-${mobileTab}`}>
      <header className="bl-top">
        <a href="/account" className="back-link"><ArrowLeft size={16} aria-hidden="true" />{L.back}</a>
        <h1 className="bl-title">{title}</h1>
        <div className="bl-top-tools">
          <button type="button" className="bl-icon" aria-label={L.undo} title={`${L.undo} (Ctrl+Z)`} disabled={locked || !history.canUndo} onClick={history.undo}><Undo2 size={17} /></button>
          <button type="button" className="bl-icon" aria-label={L.redo} title={`${L.redo} (Ctrl+Shift+Z)`} disabled={locked || !history.canRedo} onClick={history.redo}><Redo2 size={17} /></button>
          <span className="bl-sep" aria-hidden="true" />
          <div className="bl-device" role="group" aria-label="Anteprima">
            <button type="button" aria-pressed={device === "desktop"} className="bl-icon" aria-label={L.desktopPreview} onClick={() => setDevice("desktop")}><Monitor size={17} /></button>
            <button type="button" aria-pressed={device === "mobile"} className="bl-icon" aria-label={L.phonePreview} onClick={() => setDevice("mobile")}><Smartphone size={17} /></button>
          </div>
          {locked && <button type="button" className="bl-icon" aria-label={L.guests} onClick={() => setPanel(panel === "ospiti" ? "proprieta" : "ospiti")}><Users size={17} /></button>}
          {!locked && (
            <button type="button" className="btn solid small" disabled={save === "saving"} onClick={() => persist(config)}>{L.saveNow}</button>
          )}
          <span className={`bl-save save-${save}`} aria-live="polite">{saveLabel}</span>
        </div>
      </header>

      <nav className="bl-mobile-tabs" role="tablist" aria-label="Sezioni">
        <button role="tab" aria-selected={mobileTab === "blocchi"} onClick={() => setMobileTab("blocchi")}>{L.tabBlocks}</button>
        <button role="tab" aria-selected={mobileTab === "anteprima"} onClick={() => setMobileTab("anteprima")}><Eye size={15} aria-hidden="true" /> {L.tabPreview}</button>
        <button role="tab" aria-selected={mobileTab === "proprieta"} onClick={() => setMobileTab("proprieta")}>{L.tabProps}</button>
      </nav>

      <aside className="bl-left" aria-label="Blocchi">
        <Canvas
          blocks={config.blocks}
          config={config}
          catalog={catalog}
          selected={selected}
          hover={hover}
          features={features}
          onSelect={(id) => { setSelected(id); setPanel("proprieta"); setMobileTab("proprieta"); }}
          onHover={setHover}
          lang={lang}
          onAdd={addBlock}
          onToggleAddon={toggleAddon}
          onSetModel={setModel}
          onMove={moveBlock}
          onDuplicate={duplicateBlock}
          onToggle={toggleBlock}
          onRemove={removeBlock}
        />
      </aside>

      <main className="bl-center" aria-label={L.previewAria}>
        <div className="bl-preview-bar">
          <div className="bl-tpl-chip">
            <span className="bl-tpl-kicker">{L.template}</span>
            <strong>{theme ? themeCopy(theme.id, theme.name, lang) : "—"}</strong>
          </div>
          <div className="bl-preview-tools">
            <div className="bl-tools-col">
              {hasCover && (
                <label className={`bl-switch${showCover ? " is-on" : ""}`}>
                  <input type="checkbox" role="switch" checked={showCover} onChange={(e) => setShowCover(e.target.checked)} />
                  <span className="bl-switch-track" aria-hidden="true"><span className="bl-switch-knob" /></span>
                  <span>{L.showEnvelope}</span>
                </label>
              )}
              <div className="bl-history">
                <button type="button" className="bl-icon" aria-label={L.undo} title={`${L.undo} (Ctrl+Z)`} disabled={locked || !history.canUndo} onClick={history.undo}><Undo2 size={16} /></button>
                <button type="button" className="bl-icon" aria-label={L.redo} title={`${L.redo} (Ctrl+Shift+Z)`} disabled={locked || !history.canRedo} onClick={history.redo}><Redo2 size={16} /></button>
              </div>
            </div>
            <span className="bl-preview-state">{previewState === "error" ? "—" : ""}</span>
          </div>
        </div>
        <div className={`bl-frame is-${device}${refreshing ? " is-refreshing" : ""}`}>
          {preview ? (
            <iframe
              ref={frame}
              title={L.previewTitle}
              srcDoc={preview}
              sandbox="allow-scripts"
              onLoad={() => {
                frame.current?.contentWindow?.postMessage({ type: "restore", id: selected, y: scrollY.current }, "*");
                frame.current?.contentWindow?.postMessage({ type: "highlight", id: hover }, "*");
                setRefreshing(false);
              }}
            />
          ) : (
            <p className="hint">{L.loadingPreview}</p>
          )}
          {refreshing && <div className="bl-veil" role="status" aria-label={L.updating}><span className="bl-spin" /></div>}
          {device === "mobile" && scroll.max > 0 && (
            <input
              type="range"
              className="bl-scroll"
              aria-label={L.scrollPreview}
              min={0}
              max={scroll.max}
              value={scroll.y}
              onChange={(e) => frame.current?.contentWindow?.postMessage({ type: "scrollTo", y: Number(e.target.value) }, "*")}
            />
          )}
        </div>
      </main>

      <aside className="bl-right" aria-label="Proprietà">
        {panel === "ospiti" ? (
          <GuestsPanel lang={lang} invitationId={initial.id} paid={locked} hasRsvp={hasRsvp} guests={guests} onSent={(sent) => setGuests((g) => [...g, ...sent.map((email) => ({ email, sentAt: new Date().toISOString() }))])} />
        ) : (
          <Inspector
            lang={lang}
            config={config}
            catalog={catalog}
            block={block}
            busy={busy}
            onSetProp={setProp}
            onSetEvent={setEvent}
            onSetTheme={setTheme}
            locked={locked}
            onSetLocale={(locale) => edit((c) => ({ ...c, locale }))}
            onSetEventType={(eventType: EventType) => edit((c) => ({ ...c, eventType }))}
            onSetBackground={(background) => edit((c) => {
              const { background: _previous, ...rest } = c;
              return background ? { ...rest, background } : rest;
            })}
            onSetQuestions={(rsvpQuestions: RsvpQuestion[]) => edit((c) => ({ ...c, rsvpQuestions }), "questions")}
            onToggle={toggleBlock}
            onRemove={removeBlock}
            onBack={() => setSelected(null)}
            onUpload={upload}
          />
        )}
        {locked && panel === "proprieta" && (
          <p className="hint bl-locked">{L.lockedNote}</p>
        )}
      </aside>

      {error && <p role="alert" className="form-error bl-error">{error}</p>}

      <footer className="bl-footer">
        {paidAlready && editable ? (
          <div className="confirm-edit">
            <p>{lang === "en" ? "You can edit the invitation once. When you are done, confirm the edit to close it." : "Puoi modificare l'invito una sola volta. Quando hai finito, conferma la modifica per chiuderla."}</p>
            <button type="button" className="confirm-edit-btn" onClick={confirmEdit}>{lang === "en" ? "Confirm edit" : "Conferma modifica"}</button>
            {extra > 0 && <span className="confirm-edit-extra">{formatPrice(extra)}</span>}
          </div>
        ) : paidAlready && extra <= 0 ? (
          <div className="shared">
            <code>{shareUrl}</code>
            <button type="button" className="btn outline small" onClick={() => { navigator.clipboard?.writeText(shareUrl); toast.success("✓"); }}><Copy size={15} aria-hidden="true" />{L.copy}</button>
            <a className="btn solid" href={`https://wa.me/?text=${encodeURIComponent(`Ti invitiamo! Trovi tutti i dettagli qui: ${shareUrl}`)}`} target="_blank" rel="noreferrer">WhatsApp</a>
          </div>
        ) : (
          <>
            <div className="total">
              <span>{paidAlready ? (lang === "en" ? "New feature to buy" : "Funzione da acquistare") : L.total}</span>
              <strong>{formatPrice(paidAlready ? extra : total)}</strong>
              <small>{model ? modelCopy(model.id, model.name, model.tagline, model.description, lang).name : ""}</small>
            </div>
            <button type="button" className="btn solid" disabled={checkingOut} onClick={checkout}>
              {checkingOut ? L.paying : L.pay}
            </button>
          </>
        )}
      </footer>
    </div>
  );
}

