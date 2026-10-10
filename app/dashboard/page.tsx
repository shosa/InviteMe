"use client";

import { useEffect, useState } from "react";
import { TEMPLATES, formatPrice } from "@/lib/catalog";

type Metrics = {
  invitations: number;
  drafts: number;
  paid: number;
  orders: number;
  revenueCents: number;
  views: number;
  rsvps: number;
  conversionRate: number;
  checkoutsStarted: number;
  byTemplate: Record<string, number>;
  recent: { id: string; slug: string; title: string; status: string; views: number; rsvps: number; createdAt: string }[];
};

// Numero che scorre da 0 al valore: dà la sensazione di dati vivi senza librerie.
function CountUp({ value, format = (n: number) => Math.round(n).toLocaleString("it-IT") }: { value: number; format?: (n: number) => string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const from = 0;
    let frame = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / 900);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(from + (value - from) * eased);
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{format(shown)}</>;
}

export default function Dashboard() {
  const [m, setM] = useState<Metrics | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/metrics")
        .then((r) => r.json())
        .then((d: Metrics) => alive && setM(d))
        .catch(() => alive && setErr(true));
    load();
    const id = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const maxTpl = Math.max(1, ...Object.values(m?.byTemplate ?? { x: 1 }));

  return (
    <main className="dash">
      <header className="dash-head">
        <div>
          <p className="kicker">InviteMe · Metriche</p>
          <h1>Dashboard</h1>
        </div>
        <span className="live"><i /> Live · aggiornamento ogni 5 s</span>
      </header>

      {err && <p role="alert" className="error">Impossibile caricare le metriche.</p>}
      {!m && !err && <p className="hint">Caricamento…</p>}

      {m && (
        <>
          <section className="kpis">
            <Kpi label="Incasso" value={m.revenueCents / 100} format={(n) => formatPrice(Math.round(n * 100))} accent />
            <Kpi label="Inviti creati" value={m.invitations} />
            <Kpi label="Inviti pagati" value={m.paid} />
            <Kpi label="Conversione" value={m.conversionRate * 100} format={(n) => `${n.toFixed(1)}%`} />
            <Kpi label="Visualizzazioni" value={m.views} />
            <Kpi label="Risposte RSVP" value={m.rsvps} />
          </section>

          <section className="dash-grid">
            <div className="card">
              <h2>Per template</h2>
              <ul className="bars">
                {TEMPLATES.map((t) => {
                  const n = m.byTemplate[t.id] ?? 0;
                  return (
                    <li key={t.id}>
                      <span>{t.name}</span>
                      <div className="bar"><i style={{ width: `${(n / maxTpl) * 100}%` }} /></div>
                      <b>{n}</b>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="card">
              <h2>Ultimi inviti</h2>
              {m.recent.length === 0 ? (
                <p className="hint">Nessun invito ancora. Creane uno dalla home.</p>
              ) : (
                <table>
                  <thead>
                    <tr><th>Titolo</th><th>Stato</th><th>Viste</th><th>RSVP</th></tr>
                  </thead>
                  <tbody>
                    {m.recent.map((r) => (
                      <tr key={r.id}>
                        <td><a href={`/i/${r.slug}`}>{r.title}</a></td>
                        <td><span className={`pill ${r.status}`}>{r.status === "paid" ? "Pagato" : "Bozza"}</span></td>
                        <td>{r.views}</td>
                        <td>{r.rsvps}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function Kpi({ label, value, format, accent }: { label: string; value: number; format?: (n: number) => string; accent?: boolean }) {
  return (
    <div className={accent ? "kpi accent" : "kpi"}>
      <span>{label}</span>
      <strong><CountUp value={value} format={format} /></strong>
    </div>
  );
}
