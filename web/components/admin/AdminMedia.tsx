"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Film, Music, Trash2, Image as ImageIcon } from "lucide-react";

// File caricati dai clienti: quali sono in uso, quali sono orfani, eliminazione degli orfani.
type MediaFile = { name: string; kind: "foto" | "video" | "audio"; bytes: number; createdAt: string; invitations: number; music: number; orphan: boolean; ageHours: number };
type Listing = { files: MediaFile[]; totals: { count: number; bytes: number; orphans: number; orphanBytes: number; orphansOlderThanGrace: number } };

const mb = (bytes: number) => (bytes < 1048576 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1)} MB`);
const ago = (hours: number) => (hours < 48 ? `${hours} h fa` : `${Math.round(hours / 24)} giorni fa`);

export function AdminMedia() {
  const [data, setData] = useState<Listing | null>(null);
  const [filter, setFilter] = useState<"tutti" | "uso" | "orfani">("tutti");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/media");
    if (res.ok) setData((await res.json()) as Listing);
    else toast.error("Elenco dei file non disponibile");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function removeOne(name: string) {
    setBusy(name);
    const res = await fetch(`/api/admin/media/${encodeURIComponent(name)}`, { method: "DELETE" });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(null);
    if (!res.ok) return toast.error(body.error ?? "Eliminazione non riuscita");
    toast.success("File eliminato.");
    load();
  }

  async function cleanup() {
    setBusy("cleanup");
    const res = await fetch("/api/admin/media/cleanup", { method: "POST" });
    const body = (await res.json().catch(() => ({}))) as { removed?: number; bytes?: number };
    setBusy(null);
    if (!res.ok) return toast.error("Pulizia non riuscita");
    toast.success(`Pulizia fatta: ${body.removed ?? 0} file, ${mb(body.bytes ?? 0)} liberati.`);
    load();
  }

  if (!data) return <p className="hint">Caricamento…</p>;
  const shown = data.files.filter((f) => filter === "tutti" || (filter === "orfani" ? f.orphan : !f.orphan));

  return (
    <div className="adm-stack">
      <div className="kpis">
        <div className="adm-kpi"><span>File</span><b>{data.totals.count}</b><small>{mb(data.totals.bytes)} in totale</small></div>
        <div className="adm-kpi"><span>In uso</span><b>{data.totals.count - data.totals.orphans}</b><small>da inviti o dalla libreria</small></div>
        <div className="adm-kpi is-warn"><span>Orfani</span><b>{data.totals.orphans}</b><small>{mb(data.totals.orphanBytes)} non più usati</small></div>
      </div>

      <div className="adm-toolbar">
        <div className="adm-seg" role="group" aria-label="Filtro file">
          {([["tutti", "Tutti"], ["uso", "In uso"], ["orfani", "Orfani"]] as const).map(([v, label]) => (
            <button key={v} type="button" className={filter === v ? "is-on" : ""} aria-pressed={filter === v} onClick={() => setFilter(v)}>{label}</button>
          ))}
        </div>
        <button type="button" className="btn solid small" disabled={busy !== null || data.totals.orphansOlderThanGrace === 0} onClick={cleanup}>
          <Trash2 size={15} aria-hidden="true" /> Pulisci gli orfani ({data.totals.orphansOlderThanGrace})
        </button>
      </div>
      <p className="hint">La pulizia elimina solo gli orfani più vecchi di 24 ore: un caricamento appena fatto non viene toccato finché non si salva nell&apos;invito.</p>

      <div className="adm-media-grid">
        {shown.map((f) => (
          <article key={f.name} className={`adm-media${f.orphan ? " is-orphan" : ""}`}>
            <div className="adm-media-thumb">
              {f.kind === "foto" ? <img src={`/api/media/${f.name}`} alt="" loading="lazy" /> : f.kind === "video" ? <Film size={30} aria-hidden="true" /> : <Music size={30} aria-hidden="true" />}
            </div>
            <div className="adm-media-meta">
              <code title={f.name}>{f.name.slice(0, 8)}…</code>
              <span>{f.kind === "foto" && <ImageIcon size={13} aria-hidden="true" />} {f.kind} · {mb(f.bytes)} · {ago(f.ageHours)}</span>
              <span className={`adm-pill ${f.orphan ? "is-warn" : "is-paid"}`}>
                {f.orphan ? "Orfano" : `In uso · ${f.invitations + f.music} ${f.invitations + f.music === 1 ? "uso" : "usi"}`}
              </span>
            </div>
            {f.orphan && (
              <button type="button" className="btn outline small adm-media-del" disabled={busy !== null} onClick={() => removeOne(f.name)}>
                <Trash2 size={14} aria-hidden="true" /> {busy === f.name ? "Elimino…" : "Elimina"}
              </button>
            )}
          </article>
        ))}
        {shown.length === 0 && <p className="adm-empty">Nessun file in questa vista.</p>}
      </div>
    </div>
  );
}
