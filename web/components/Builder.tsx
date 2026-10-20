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
} from "@inviteme/shared";
import { toast } from "sonner";
import { ArrowLeft, Copy, Eye, Monitor, Redo2, Smartphone, Undo2, Users } from "lucide-react";
import { Canvas } from "./builder/Canvas";
import { Inspector } from "./builder/Inspector";
import { GuestsPanel } from "./builder/guests";
import { useHistory } from "./builder/history";
import { ui, type Lang } from "@/lib/ui";
import { modelCopy, themeCopy } from "@/lib/catalogCopy";

export type Manage = {
  id: string;
  slug: string;
  status: "draft" | "paid";
  config: InviteConfig;
  guests: { email: string; sentAt: string }[];
  catalog: Catalog;
};

type MobileTab = "blocchi" | "anteprima" | "proprieta";
type Device = "desktop" | "mobile";
type Save = "saved" | "saving" | "error";

// Editor dell'invito: palette e struttura a sinistra, anteprima reale al centro, proprietà a destra.
export function Builder({ initial, lang = "it" }: { initial: Manage; lang?: Lang }) {
  const L = ui(lang).builder;
  const catalog = initial.catalog;
  const history = useHistory<InviteConfig>(initial.config);
  const config = history.present;
  const locked = initial.status === "paid";

  const [selected, setSelected] = useState<string | null>(null);
  const [panel, setPanel] = useState<"proprieta" | "ospiti">("proprieta");
  const [device, setDevice] = useState<Device>("mobile");
  const [mobileTab, setMobileTab] = useState<MobileTab>("anteprima");
  const [save, setSave] = useState<Save>("saved");
  const [preview, setPreview] = useState("");
  const [previewState, setPreviewState] = useState<"ready" | "loading" | "error">("loading");
  const [busy, setBusy] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [guests, setGuests] = useState(initial.guests);
  const [firstSave, setFirstSave] = useState(true);
  const [showCover, setShowCover] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [scroll, setScroll] = useState({ y: 0, max: 0 });
  const frame = useRef<HTMLIFrameElement>(null);
  const scrollY = useRef(0);

  const model = getModel(catalog, config.model);
  const theme = catalog.themes.find((t) => t.manifest.id === config.themeId)?.manifest;
  const features = useMemo(() => new Set(activeFeatures(catalog, config.model, config.addons) as Set<AddonKey>), [catalog, config.model, config.addons]);
  const total = useMemo(() => totalCents(catalog, config.model, config.addons), [catalog, config.model, config.addons]);
  const block = config.blocks.find((b) => b.id === selected) ?? null;
  const title = String(config.event.title ?? "") || L.unnamed;
  const hasRsvp = config.blocks.some((b) => b.type === "rsvp");

  useEffect(() => setOrigin(window.location.origin), []);

  // Salvataggio automatico: il database riceve sempre l'ultima versione.
  useEffect(() => {
    if (firstSave) {
      setFirstSave(false);
      return;
    }
    if (locked) return;
    setSave("saving");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/invitations/${initial.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config) });
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
    }, 650);
    return () => clearTimeout(t);
  }, [config, initial.id, locked]); // eslint-disable-line react-hooks/exhaustive-deps

  // Anteprima: la pagina reale del motore, rigenerata dal server con la configurazione in corso.
  useEffect(() => {
    let alive = true;
    setPreviewState("loading");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/invitations/${initial.id}/preview?cover=${showCover ? 1 : 0}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config) });
        if (!alive) return;
        if (res.ok) {
          setPreview(await res.text());
          setPreviewState("ready");
        } else {
          setPreviewState("error");
        }
      } catch {
        if (alive) setPreviewState("error");
      }
    }, 420);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [config, initial.id, showCover]);

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
    edit((c) => ({ ...c, blocks: [...c.blocks, b], addons: feature && !c.addons.includes(feature) ? [...c.addons, feature] : c.addons }));
    setSelected(b.id);
  }
  // Funzioni a pagamento: si attivano dalla finestra dei blocchi. Le funzioni del modello sono sempre attive.
  function toggleAddon(key: AddonKey) {
    edit((c) => ({ ...c, addons: c.addons.includes(key) ? c.addons.filter((a) => a !== key) : [...c.addons, key] }));
  }
  // Cambio di modello: si tengono solo le funzioni che il nuovo modello offre, e il tema resta se è compatibile.
  function setModel(id: string) {
    edit((c) => {
      const m = getModel(catalog, id);
      const themes = enabledThemes(catalog, id);
      const themeId = themes.some((t) => t.id === c.themeId) ? c.themeId : (themes[0]?.id ?? c.themeId);
      return { ...c, model: id, addons: c.addons.filter((a) => m?.options.includes(a)), themeId };
    });
  }
  function moveBlock(from: number, to: number) {
    edit((c) => {
      const list = [...c.blocks];
      const [moved] = list.splice(from, 1);
      list.splice(Math.max(0, Math.min(list.length, to)), 0, moved);
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
    edit((c) => ({ ...c, blocks: c.blocks.filter((b) => b.id !== id) }));
    if (selected === id) setSelected(null);
  }
  function setProp(id: string, key: string, value: unknown, group?: string) {
    edit((c) => ({ ...c, blocks: c.blocks.map((b) => (b.id === id ? { ...b, props: { ...b.props, [key]: value } } : b)) }), group);
  }
  function setEvent(key: string, value: unknown, group?: string) {
    edit((c) => ({ ...c, event: { ...c.event, [key]: value } }), group);
  }
  function setTheme(id: string) {
    edit((c) => ({ ...c, themeId: id }));
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
          <span>{theme ? themeCopy(theme.id, theme.name, lang) : L.template}</span>
          <label className="bl-cover-toggle"><input type="checkbox" checked={showCover} onChange={(e) => setShowCover(e.target.checked)} /> {L.showEnvelope}</label>
          <span className="bl-preview-state">{previewState === "loading" ? L.updating : previewState === "error" ? "—" : ""}</span>
        </div>
        <div className={`bl-frame is-${device}`}>
          {preview ? (
            <iframe
              ref={frame}
              title={L.previewTitle}
              srcDoc={preview}
              sandbox="allow-scripts"
              onLoad={() => {
                frame.current?.contentWindow?.postMessage({ type: "restore", id: selected, y: scrollY.current }, "*");
                frame.current?.contentWindow?.postMessage({ type: "highlight", id: hover }, "*");
              }}
            />
          ) : (
            <p className="hint">{L.loadingPreview}</p>
          )}
          {device === "mobile" && scroll.max > 0 && (
            <input
              type="range"
              className="bl-scroll"
              aria-label={L.scrollPreview}
              min={0}
              max={scroll.max}
              value={scroll.max - scroll.y}
              onChange={(e) => frame.current?.contentWindow?.postMessage({ type: "scrollTo", y: scroll.max - Number(e.target.value) }, "*")}
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
            onSetLocale={(locale) => edit((c) => ({ ...c, locale }))}
            onSetEventType={(eventType: EventType) => edit((c) => ({ ...c, eventType }))}
            onSetQuestions={(rsvpQuestions: RsvpQuestion[]) => edit((c) => ({ ...c, rsvpQuestions }), "questions")}
            onToggle={toggleBlock}
            onRemove={removeBlock}
            onUpload={upload}
          />
        )}
        {locked && panel === "proprieta" && (
          <p className="hint bl-locked">{L.lockedNote}</p>
        )}
      </aside>

      {error && <p role="alert" className="form-error bl-error">{error}</p>}

      <footer className="bl-footer">
        {locked ? (
          <div className="shared">
            <code>{shareUrl}</code>
            <button type="button" className="btn outline small" onClick={() => { navigator.clipboard?.writeText(shareUrl); toast.success("✓"); }}><Copy size={15} aria-hidden="true" />{L.copy}</button>
            <a className="btn solid" href={`https://wa.me/?text=${encodeURIComponent(`Ti invitiamo! Trovi tutti i dettagli qui: ${shareUrl}`)}`} target="_blank" rel="noreferrer">WhatsApp</a>
          </div>
        ) : (
          <>
            <div className="total">
              <span>{L.total}</span>
              <strong>{formatPrice(total)}</strong>
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

