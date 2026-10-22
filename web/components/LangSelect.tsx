"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ui, type Lang } from "@/lib/ui";

// Selettore della lingua del sito: bandiera e nome, con l'elenco delle lingue. Il cambio passa da /lingua/[lang], che salva il cookie.
const OPTIONS: { code: Lang; name: string; flag: string }[] = [
  { code: "it", name: "Italiano", flag: "fi-it" },
  { code: "en", name: "English", flag: "fi-gb" },
];

export function LangSelect({ lang }: { lang: Lang }) {
  const t = ui(lang);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = OPTIONS.find((o) => o.code === lang) ?? OPTIONS[0];

  // Chiude con Esc e con un clic fuori dal selettore.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(code: Lang) {
    setOpen(false);
    if (code !== lang) window.location.href = `/lingua/${code}`;
  }

  return (
    <div className="lang-select" ref={ref}>
      <button
        type="button"
        className="lang-select-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`${t.langLabel}: ${current.name}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={`fi ${current.flag} lang-flag`} aria-hidden="true" />
        <span>{current.code.toUpperCase()}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <ul id={listId} role="listbox" aria-label={t.langLabel} className="lang-select-list">
          {OPTIONS.map((o) => (
            <li
              key={o.code}
              role="option"
              aria-selected={o.code === lang}
              tabIndex={0}
              className="lang-select-opt"
              onClick={() => choose(o.code)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  choose(o.code);
                }
              }}
            >
              <span className={`fi ${o.flag} lang-flag`} aria-hidden="true" />
              <span>{o.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
