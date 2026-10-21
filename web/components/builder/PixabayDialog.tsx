"use client";

import { createContext, useContext, useState, type FormEvent } from "react";
import { importStock, searchStock, type StockPhoto } from "@/lib/stock";

// L'invito aperto nel builder: serve alla ricerca e all'importazione delle foto.
export const StockContext = createContext<string | null>(null);
export function useStockInvitation(): string | null {
  return useContext(StockContext);
}

type Props = { invitationId: string; onClose: () => void; onPick: (url: string) => void };

// Ricerca di foto su Pixabay dentro l'editor: la foto scelta viene salvata nell'invito, come un upload.
export function PixabayDialog({ invitationId, onClose, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("");
  const [photos, setPhotos] = useState<StockPhoto[]>([]);
  const [page, setPage] = useState(1);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState<"search" | number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(q: string, p: number) {
    setBusy("search");
    setError(null);
    try {
      const found = await searchStock(invitationId, q, p, "it");
      setPhotos((prev) => (p === 1 ? found : [...prev, ...found]));
      setActive(q);
      setPage(p);
      setSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ricerca non riuscita");
    } finally {
      setBusy(null);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) return setError("Scrivi almeno 2 lettere");
    run(q, 1);
  }

  async function pick(photo: StockPhoto) {
    setBusy(photo.id);
    setError(null);
    try {
      onPick(await importStock(invitationId, photo.id));
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Importazione non riuscita");
      setBusy(null);
    }
  }

  return (
    <div className="bl-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}>
      <div className="bl-modal stock-modal" role="dialog" aria-modal="true" aria-labelledby="stock-title">
        <header className="bl-modal-head">
          <div>
            <h2 id="stock-title">Foto da Pixabay</h2>
            <p className="hint">La foto scelta viene salvata nel tuo invito.</p>
          </div>
          <button type="button" className="bl-icon" aria-label="Chiudi" onClick={onClose}>×</button>
        </header>
        <form className="stock-search" onSubmit={onSubmit}>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Es. fiori, mare, lanterne" aria-label="Cerca una foto" autoFocus />
          <button className="btn" type="submit" disabled={busy !== null}>{busy === "search" ? "Cerco…" : "Cerca"}</button>
        </form>
        {error && <p className="hint stock-error" role="alert">{error}</p>}
        <div className="stock-grid">
          {photos.map((p) => (
            <button key={p.id} type="button" className="stock-item" onClick={() => pick(p)} disabled={busy !== null} aria-label={`Usa questa foto di ${p.user}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.preview} alt="" loading="lazy" />
              {busy === p.id && <span className="stock-wait">Salvo…</span>}
            </button>
          ))}
        </div>
        {searched && photos.length === 0 && busy === null && <p className="hint">Nessuna foto trovata: prova con un'altra parola.</p>}
        {photos.length > 0 && (
          <div className="stock-foot">
            <button type="button" className="link" disabled={busy !== null} onClick={() => run(active, page + 1)}>Altre foto</button>
            <p className="hint">Foto di Pixabay, con licenza Pixabay.</p>
          </div>
        )}
      </div>
    </div>
  );
}
