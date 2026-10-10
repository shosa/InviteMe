"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { AddonDef, Catalog, MusicTrack, ModelDef, StyleDef } from "@inviteme/shared";

type Tab = "panoramica" | "modelli" | "funzioni" | "stili" | "musica" | "ordini" | "utenti";
const TABS: { id: Tab; label: string }[] = [
  { id: "panoramica", label: "Panoramica" },
  { id: "modelli", label: "Modelli" },
  { id: "funzioni", label: "Funzioni e prezzi" },
  { id: "stili", label: "Stili" },
  { id: "musica", label: "Musica" },
  { id: "ordini", label: "Ordini" },
  { id: "utenti", label: "Utenti" },
];

type Metrics = {
  users: number; invitations: number; drafts: number; paid: number; orders: number; revenueCents: number;
  views: number; rsvps: number; guestEmailsSent: number; checkoutsStarted: number; conversionRate: number;
  byModel: Record<string, number>;
};

// Prezzi nell'interfaccia in euro, nel database in centesimi.
const toEuro = (cents: number) => (cents / 100).toString();
const toCents = (v: string) => Math.max(0, Math.round((Number(v.replace(",", ".")) || 0) * 100));
const fmt = (cents: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);

// Console admin: modelli, funzioni e prezzi, stili, libreria musicale, ordini e utenti.
export function AdminConsole() {
  const [tab, setTab] = useState<Tab>("panoramica");
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function reload() {
    const res = await fetch("/api/admin/catalog");
    if (res.ok) setCatalog((await res.json()) as Catalog);
  }
  useEffect(() => {
    reload();
  }, []);

  // Salva l'intero catalogo: l'API valida ogni campo e ignora ciò che non è consentito.
  async function saveCatalog(next: Pick<Catalog, "models" | "addons" | "styles">) {
    setNotice(null);
    const res = await fetch("/api/admin/catalog", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) return setNotice({ kind: "err", text: data.error ?? "Salvataggio non riuscito" });
    setNotice({ kind: "ok", text: "Modifiche salvate. Sono già visibili sul sito." });
    reload();
  }

  return (
    <main className="admin">
      <header className="admin-head">
        <div>
          <p className="eyebrow">Console amministrativa</p>
          <h1>InviteMe</h1>
        </div>
        {notice && <p className={notice.kind === "ok" ? "form-notice admin-notice" : "form-error admin-notice"} role="status">{notice.text}</p>}
      </header>

      <div className="admin-layout">
        <nav className="admin-nav" aria-label="Sezioni della console">
          {TABS.map((t) => (
            <button key={t.id} type="button" className={tab === t.id ? "is-on" : ""} aria-current={tab === t.id ? "page" : undefined} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>

        <section className="admin-body">
          {tab === "panoramica" && <Overview />}
          {tab === "modelli" && catalog && <ModelsEditor catalog={catalog} onSave={saveCatalog} />}
          {tab === "funzioni" && catalog && <AddonsEditor catalog={catalog} onSave={saveCatalog} />}
          {tab === "stili" && catalog && <StylesEditor catalog={catalog} onSave={saveCatalog} />}
          {tab === "musica" && <MusicLibrary tracks={catalog?.music ?? []} onChange={reload} />}
          {tab === "ordini" && <Orders />}
          {tab === "utenti" && <Users />}
          {!catalog && (tab === "modelli" || tab === "funzioni" || tab === "stili") && <p className="hint">Caricamento…</p>}
        </section>
      </div>
    </main>
  );
}

function Overview() {
  const [m, setM] = useState<Metrics | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/admin/metrics")
      .then(async (r) => (r.ok ? r.json() : Promise.reject(new Error("Metriche non disponibili"))))
      .then((d: Metrics) => setM(d))
      .catch((e: Error) => setErr(e.message));
  }, []);
  if (err) return <p className="form-error">{err}</p>;
  if (!m) return <p className="hint">Caricamento…</p>;
  const maxModel = Math.max(1, ...Object.values(m.byModel));
  return (
    <div className="stack-lg">
      <div className="kpis">
        <Kpi label="Incasso" value={fmt(m.revenueCents)} />
        <Kpi label="Ordini pagati" value={String(m.orders)} />
        <Kpi label="Inviti attivi" value={String(m.paid)} />
        <Kpi label="Conversione" value={`${(m.conversionRate * 100).toFixed(1)}%`} />
        <Kpi label="Account" value={String(m.users)} />
        <Kpi label="Visite" value={String(m.views)} />
        <Kpi label="Risposte" value={String(m.rsvps)} />
        <Kpi label="Email ospiti" value={String(m.guestEmailsSent)} />
      </div>
      <div className="card">
        <h2>Inviti per modello</h2>
        <ul className="bar-list">
          {Object.entries(m.byModel).map(([model, n]) => (
            <li key={model}>
              <span>{model}</span>
              <div className="bar"><i style={{ width: `${(n / maxModel) * 100}%` }} /></div>
              <b>{n}</b>
            </li>
          ))}
          {Object.keys(m.byModel).length === 0 && <li className="hint">Nessun invito ancora.</li>}
        </ul>
      </div>
    </div>
  );
}

function ModelsEditor({ catalog, onSave }: { catalog: Catalog; onSave: (c: Pick<Catalog, "models" | "addons" | "styles">) => void }) {
  const [models, setModels] = useState<ModelDef[]>(catalog.models);
  const [euros, setEuros] = useState<Record<string, string>>(() => Object.fromEntries(catalog.models.map((m) => [m.id, toEuro(m.priceCents)])));
  const update = (id: string, patch: Partial<ModelDef>) => setModels((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const toggleIn = (m: ModelDef, key: ModelDef["included"][number], field: "included" | "options") => {
    const list = m[field];
    const next = list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
    update(m.id, { [field]: next } as Partial<ModelDef>);
  };
  const addModel = () => {
    const id = `modello-${Date.now().toString(36)}`;
    setModels((ms) => [...ms, { id, name: "Nuovo modello", tagline: "", description: "", priceCents: 4900, included: [], options: [], enabled: false, sort: ms.length + 1 }]);
    setEuros((e) => ({ ...e, [id]: "49" }));
  };
  const save = () => onSave({ models: models.map((m) => ({ ...m, priceCents: toCents(euros[m.id] ?? "0") })), addons: catalog.addons, styles: catalog.styles });

  return (
    <div className="stack-lg">
      <p className="hint">Modelli visibili, prezzi base e funzioni incluse o acquistabili. Un modello disattivato sparisce dal sito ma resta nel database.</p>
      {models.map((m) => (
        <article key={m.id} className="card editor">
          <div className="editor-head">
            <label className="switch"><input type="checkbox" checked={m.enabled} onChange={(e) => update(m.id, { enabled: e.target.checked })} /><span>{m.enabled ? "Visibile" : "Nascosto"}</span></label>
            <code>{m.id}</code>
          </div>
          <div className="form-grid">
            <Field label="Nome"><input value={m.name} maxLength={80} onChange={(e) => update(m.id, { name: e.target.value })} /></Field>
            <Field label="Prezzo base (€)"><input inputMode="decimal" value={euros[m.id] ?? ""} onChange={(e) => setEuros((x) => ({ ...x, [m.id]: e.target.value }))} /></Field>
            <Field label="Ordine"><input type="number" value={m.sort} onChange={(e) => update(m.id, { sort: Number(e.target.value) || 0 })} /></Field>
            <Field label="Slogan" wide><input value={m.tagline} maxLength={120} onChange={(e) => update(m.id, { tagline: e.target.value })} /></Field>
            <Field label="Descrizione" wide><textarea rows={2} maxLength={400} value={m.description} onChange={(e) => update(m.id, { description: e.target.value })} /></Field>
          </div>
          <fieldset className="checks">
            <legend>Incluse nel prezzo base</legend>
            {catalog.addons.map((a) => (
              <label key={a.key} className="check"><input type="checkbox" checked={m.included.includes(a.key)} onChange={() => toggleIn(m, a.key, "included")} /> {a.label}</label>
            ))}
          </fieldset>
          <fieldset className="checks">
            <legend>Acquistabili a parte</legend>
            {catalog.addons.map((a) => (
              <label key={a.key} className="check"><input type="checkbox" disabled={m.included.includes(a.key)} checked={m.options.includes(a.key)} onChange={() => toggleIn(m, a.key, "options")} /> {a.label}</label>
            ))}
          </fieldset>
        </article>
      ))}
      <div className="actions">
        <button type="button" className="btn outline" onClick={addModel}>Aggiungi modello</button>
        <button type="button" className="btn solid" onClick={save}>Salva modelli</button>
      </div>
    </div>
  );
}

function AddonsEditor({ catalog, onSave }: { catalog: Catalog; onSave: (c: Pick<Catalog, "models" | "addons" | "styles">) => void }) {
  const [addons, setAddons] = useState<AddonDef[]>(catalog.addons);
  const [euros, setEuros] = useState<Record<string, string>>(() => Object.fromEntries(catalog.addons.map((a) => [a.key, toEuro(a.cents)])));
  const patch = (key: string, p: Partial<AddonDef>) => setAddons((list) => list.map((a) => (a.key === key ? { ...a, ...p } : a)));
  const save = () => onSave({ models: catalog.models, styles: catalog.styles, addons: addons.map((a) => ({ ...a, cents: toCents(euros[a.key] ?? "0") })) });
  return (
    <div className="stack-lg">
      <p className="hint">Ogni funzione ha un prezzo fisso. Le modifiche valgono per tutti i modelli che la includono o la vendono a parte.</p>
      <div className="card table-wrap">
        <table className="admin-table">
          <thead><tr><th>Attiva</th><th>Funzione</th><th>Descrizione</th><th>Prezzo (€)</th></tr></thead>
          <tbody>
            {addons.map((a) => (
              <tr key={a.key}>
                <td><input type="checkbox" checked={a.enabled} onChange={(e) => patch(a.key, { enabled: e.target.checked })} aria-label={`Attiva ${a.label}`} /></td>
                <td><input value={a.label} maxLength={80} onChange={(e) => patch(a.key, { label: e.target.value })} /></td>
                <td><input value={a.description} maxLength={160} onChange={(e) => patch(a.key, { description: e.target.value })} /></td>
                <td><input inputMode="decimal" className="price-in" value={euros[a.key] ?? ""} onChange={(e) => setEuros((x) => ({ ...x, [a.key]: e.target.value }))} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="actions"><button type="button" className="btn solid" onClick={save}>Salva funzioni e prezzi</button></div>
    </div>
  );
}

function StylesEditor({ catalog, onSave }: { catalog: Catalog; onSave: (c: Pick<Catalog, "models" | "addons" | "styles">) => void }) {
  const [styles, setStyles] = useState<StyleDef[]>(catalog.styles);
  const patch = (id: string, p: Partial<StyleDef>) => setStyles((list) => list.map((s) => (s.id === id ? { ...s, ...p } : s)));
  return (
    <div className="stack-lg">
      <p className="hint">Colori e tipografia degli inviti. Gli stili disattivati non compaiono più nel sito.</p>
      <div className="style-admin">
        {styles.map((s) => (
          <article key={s.id} className="card" style={{ background: s.bg, color: s.ink }}>
            <label className="switch"><input type="checkbox" checked={s.enabled} onChange={(e) => patch(s.id, { enabled: e.target.checked })} /><span>{s.enabled ? "Attivo" : "Disattivato"}</span></label>
            <h3 className={s.font === "serif" ? "serif" : "sans"}>{s.name}</h3>
            <div className="form-grid">
              <Field label="Nome"><input value={s.name} maxLength={40} onChange={(e) => patch(s.id, { name: e.target.value })} /></Field>
              <Field label="Carattere">
                <select value={s.font} onChange={(e) => patch(s.id, { font: e.target.value as "serif" | "sans" })}>
                  <option value="serif">Classico (serif)</option>
                  <option value="sans">Moderno (sans)</option>
                </select>
              </Field>
              <Field label="Sfondo"><input type="color" value={s.bg} onChange={(e) => patch(s.id, { bg: e.target.value })} /></Field>
              <Field label="Testo"><input type="color" value={s.ink} onChange={(e) => patch(s.id, { ink: e.target.value })} /></Field>
              <Field label="Accento"><input type="color" value={s.accent} onChange={(e) => patch(s.id, { accent: e.target.value })} /></Field>
            </div>
          </article>
        ))}
      </div>
      <div className="actions">
        <button type="button" className="btn solid" onClick={() => onSave({ models: catalog.models, addons: catalog.addons, styles })}>Salva stili</button>
      </div>
    </div>
  );
}

function MusicLibrary({ tracks, onChange }: { tracks: MusicTrack[]; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [all, setAll] = useState<(MusicTrack & { created_at?: string })[]>([]);
  const load = () => fetch("/api/admin/music").then((r) => (r.ok ? r.json() : [])).then(setAll).catch(() => setAll([]));
  useEffect(() => {
    load();
  }, []);

  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/music", { method: "POST", body: data });
    const out = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) return setMsg({ kind: "err", text: out.error ?? "Caricamento non riuscito" });
    setMsg({ kind: "ok", text: "Brano caricato nella libreria." });
    form.reset();
    load();
    onChange();
  }
  async function toggle(id: string, enabled: boolean) {
    await fetch(`/api/admin/music/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) });
    load();
    onChange();
  }
  async function remove(id: string) {
    if (!confirm("Eliminare questo brano dalla libreria? Gli inviti che lo usano smetteranno di riprodurlo.")) return;
    await fetch(`/api/admin/music/${id}`, { method: "DELETE" });
    load();
    onChange();
  }

  return (
    <div className="stack-lg">
      <form className="card" onSubmit={upload}>
        <h2>Carica un brano</h2>
        <p className="hint">MP3, M4A o OGG, massimo 15 MB. Carica solo brani di cui hai i diritti o che sono licenziati per questo uso.</p>
        <div className="form-grid">
          <Field label="File audio"><input type="file" name="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/ogg" required /></Field>
          <Field label="Titolo"><input name="title" maxLength={120} required /></Field>
          <Field label="Artista"><input name="artist" maxLength={120} /></Field>
          <Field label="Licenza o fonte" wide><input name="license" maxLength={300} placeholder="Es. licenza Epidemic Sound, acquisto del 12/03/2026" /></Field>
        </div>
        <label className="check"><input type="checkbox" name="rights" value="true" required /> Confermo di avere i diritti di questo brano per l&apos;uso in un invito digitale.</label>
        <div className="actions">
          <button type="submit" className="btn solid" disabled={busy}>{busy ? "Caricamento…" : "Carica nella libreria"}</button>
        </div>
        {msg && <p className={msg.kind === "ok" ? "form-notice" : "form-error"} role="status">{msg.text}</p>}
      </form>

      <div className="card table-wrap">
        <h2>Libreria</h2>
        {all.length === 0 ? (
          <p className="hint">Nessun brano. Carica il primo sopra.</p>
        ) : (
          <table className="admin-table">
            <thead><tr><th>Brano</th><th>Ascolta</th><th>Licenza</th><th>Visibile</th><th /></tr></thead>
            <tbody>
              {all.map((t) => (
                <tr key={t.id}>
                  <td><b>{t.title}</b><small className="block-hint">{t.artist}</small></td>
                  <td><audio controls preload="none" src={t.url} /></td>
                  <td className="small">{t.license || "–"}</td>
                  <td><input type="checkbox" checked={t.enabled} onChange={(e) => toggle(t.id, e.target.checked)} aria-label={`Visibile: ${t.title}`} /></td>
                  <td><button type="button" className="link danger" onClick={() => remove(t.id)}>Elimina</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Orders() {
  const [rows, setRows] = useState<{ id: string; title: string | null; email: string | null; amount_cents: number; source: string; status: string; created_at: string }[]>([]);
  useEffect(() => {
    fetch("/api/admin/orders").then((r) => (r.ok ? r.json() : [])).then(setRows).catch(() => setRows([]));
  }, []);
  return (
    <div className="card table-wrap">
      <h2>Ordini</h2>
      {rows.length === 0 ? (
        <p className="hint">Nessun ordine ancora.</p>
      ) : (
        <table className="admin-table">
          <thead><tr><th>Data</th><th>Invito</th><th>Cliente</th><th>Importo</th><th>Fonte</th><th>Stato</th></tr></thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id}>
                <td>{new Date(o.created_at).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })}</td>
                <td>{o.title ?? "–"}</td>
                <td>{o.email ?? "–"}</td>
                <td>{fmt(o.amount_cents)}</td>
                <td>{o.source}</td>
                <td><span className={`pill ${o.status === "paid" ? "yes" : "draft"}`}>{o.status === "paid" ? "Pagato" : "In attesa"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Users() {
  const [rows, setRows] = useState<{ id: string; email: string; name: string; role: string; invitations: number; created_at: string }[]>([]);
  const load = () => fetch("/api/admin/users").then((r) => (r.ok ? r.json() : [])).then(setRows).catch(() => setRows([]));
  useEffect(() => {
    load();
  }, []);
  async function setRole(id: string, role: string) {
    await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
    load();
  }
  return (
    <div className="card table-wrap">
      <h2>Utenti</h2>
      <table className="admin-table">
        <thead><tr><th>Nome</th><th>Email</th><th>Inviti</th><th>Ruolo</th></tr></thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.invitations}</td>
              <td>
                <select value={u.role} onChange={(e) => setRole(u.id, e.target.value)} aria-label={`Ruolo di ${u.email}`}>
                  <option value="user">Cliente</option>
                  <option value="admin">Amministratore</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="kpi">
      <span>{label}</span>
      <strong>{value}</strong>
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
