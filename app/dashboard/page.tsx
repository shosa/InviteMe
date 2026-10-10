"use client";

import { useEffect, useState, type FormEvent } from "react";
import { MODELS, formatPrice } from "@/lib/catalog";

type Metrics = {
  users: number;
  invitations: number;
  drafts: number;
  paid: number;
  orders: number;
  revenueCents: number;
  views: number;
  rsvps: number;
  guestEmailsSent: number;
  conversionRate: number;
  checkoutsStarted: number;
  byModel: Record<string, number>;
  recent: { id: string; slug: string; title: string; model: string; status: string; views: number; rsvps: number; createdAt: string }[];
};

const KEY = "inviteme-admin";

// Pannello interno: metriche aggregate di tutto il servizio. Richiede ADMIN_TOKEN in produzione.
export default function Dashboard() {
  const [m, setM] = useState<Metrics | null>(null);
  const [needsKey, setNeedsKey] = useState(false);
  const [key, setKey] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let stored = "";
    try {
      stored = sessionStorage.getItem(KEY) ?? "";
    } catch {
      /* storage non disponibile */
    }
    const load = () =>
      fetch("/api/metrics", { headers: stored ? { Authorization: `Bearer ${stored}` } : {} })
        .then((r) => {
          if (r.status === 401) {
            if (alive) setNeedsKey(true);
            return null;
          }
          if (!r.ok) throw new Error("Metriche non disponibili");
          return r.json();
        })
        .then((d: Metrics | null) => {
          if (alive && d) {
            setM(d);
            setNeedsKey(false);
          }
        })
        .catch((e: Error) => alive && setErr(e.message));
    load();
    const id = setInterval(load, 10_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  function unlock(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      sessionStorage.setItem(KEY, key);
    } catch {
      /* ignorato */
    }
    window.location.reload();
  }

  if (needsKey) {
    return (
      <main className="admin">
        <form className="admin-gate" onSubmit={unlock}>
          <p className="eyebrow">Area riservata</p>
          <h1>Chiave admin</h1>
          <label className="field">
            <span>ADMIN_TOKEN</span>
            <input type="password" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" />
          </label>
          <button className="btn solid wide" type="submit" disabled={!key}>Apri il pannello</button>
        </form>
      </main>
    );
  }

  return (
    <main className="admin">
      <header className="admin-head">
        <div>
          <p className="eyebrow">InviteMe · Amministrazione</p>
          <h1>Panoramica</h1>
        </div>
        <span className="live"><i aria-hidden /> Aggiornato ogni 10 secondi</span>
      </header>

      {err && <p role="alert" className="form-error">{err}</p>}
      {!m && !err && <p className="hint">Caricamento…</p>}

      {m && (
        <>
          <section className="kpis">
            <Kpi label="Incasso" value={formatPrice(m.revenueCents)} />
            <Kpi label="Ordini pagati" value={String(m.orders)} />
            <Kpi label="Conversione" value={`${(m.conversionRate * 100).toFixed(1)}%`} />
            <Kpi label="Account" value={String(m.users)} />
            <Kpi label="Visite agli inviti" value={String(m.views)} />
            <Kpi label="Risposte RSVP" value={String(m.rsvps)} />
            <Kpi label="Email agli ospiti" value={String(m.guestEmailsSent)} />
            <Kpi label="Checkout avviati" value={String(m.checkoutsStarted)} />
          </section>

          <section className="admin-grid">
            <div className="card">
              <h2>Per modello</h2>
              <ul className="bars">
                {MODELS.map((mod) => {
                  const n = m.byModel[mod.id] ?? 0;
                  const max = Math.max(1, ...Object.values(m.byModel));
                  return (
                    <li key={mod.id}>
                      <span>{mod.name}</span>
                      <div className="bar"><i style={{ width: `${(n / max) * 100}%` }} /></div>
                      <b>{n}</b>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="card">
              <h2>Ultimi inviti</h2>
              {m.recent.length === 0 ? (
                <p className="hint">Nessun invito ancora.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Titolo</th><th>Stato</th><th>Visite</th><th>RSVP</th></tr></thead>
                    <tbody>
                      {m.recent.map((r) => (
                        <tr key={r.id}>
                          <td>{r.status === "paid" ? <a href={`/i/${r.slug}`}>{r.title}</a> : r.title}</td>
                          <td><span className={`pill ${r.status === "paid" ? "yes" : "draft"}`}>{r.status === "paid" ? "Attivo" : "Bozza"}</span></td>
                          <td>{r.views}</td>
                          <td>{r.rsvps}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </main>
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
