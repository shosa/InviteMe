"use client";

import { useEffect, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";

// Campo di ricerca luoghi: mentre si scrive cerca gli indirizzi reali (il server, OpenStreetMap) e
// la persona sceglie uno dei risultati. Il testo scritto a mano resta, ma non è confermato.
export function PlaceSearch({
  lang,
  initial = "",
  disabled = false,
  onType,
  onPick,
}: {
  lang: "it" | "en";
  initial?: string;
  disabled?: boolean;
  onType?: (text: string) => void;
  onPick: (address: string) => void;
}) {
  const it = lang !== "en";
  const [q, setQ] = useState(initial);
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);

  useEffect(() => {
    if (chosen !== null || q.trim().length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }
    const ctl = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(q.trim())}`, { signal: ctl.signal });
        const data = (await res.json()) as { places?: string[] };
        setResults(data.places ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 380);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q, chosen]);

  const pick = (address: string) => {
    setChosen(address);
    setQ(address);
    setResults([]);
    onPick(address);
  };

  return (
    <div className="as-place">
      <label className="as-place-field">
        <Search size={16} aria-hidden="true" />
        <input
          type="search"
          value={q}
          disabled={disabled}
          placeholder={it ? "Scrivi il nome del luogo e la città" : "Type the venue name and city"}
          aria-label={it ? "Cerca il luogo" : "Search the venue"}
          onChange={(e) => {
            setChosen(null);
            setQ(e.target.value);
            onType?.(e.target.value);
          }}
        />
        {loading && <Loader2 size={16} className="as-spin" aria-label={it ? "Ricerca in corso" : "Searching"} />}
      </label>

      {results.length > 0 && (
        <ul className="as-place-list" role="radiogroup" aria-label={it ? "Risultati" : "Results"}>
          {results.map((r, i) => (
            <li key={r} style={{ animationDelay: `${i * 60}ms` }}>
              <button type="button" role="radio" aria-checked={chosen === r} disabled={disabled} className="as-place-opt" onClick={() => pick(r)}>
                <MapPin size={15} aria-hidden="true" />
                <span>{r}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {chosen !== null && <p className="as-place-ok">{it ? "Indirizzo scelto." : "Address chosen."}</p>}
      {!loading && chosen === null && q.trim().length >= 3 && results.length === 0 && (
        <p className="as-place-none">{it ? "Nessun risultato: prova con la città o il CAP." : "No results: try adding the city or the postcode."}</p>
      )}
    </div>
  );
}
