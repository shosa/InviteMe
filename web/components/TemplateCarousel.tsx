"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { ThemeManifest } from "@inviteme/shared";
import { themeCopy } from "@/lib/catalogCopy";
import { ui, type Lang } from "@/lib/ui";

// Tempo tra una diapositiva e la successiva, e pausa dopo un'interazione dell'utente.
const STEP_MS = 3800;
const RESUME_MS = 6000;

// Carosello dei template pre-fatti: ogni template è un telefono con la sua pagina reale, che scorre da solo.
// Si sceglie toccando il telefono: niente pulsanti con il nome.
export function TemplateCarousel({ templates, selectedId, onSelect, label, lang = "it", size = "md" }: { templates: ThemeManifest[]; selectedId: string; onSelect: (id: string) => void; label: string; lang?: Lang; size?: "md" | "lg" }) {
  const L = ui(lang).builder;
  const track = useRef<HTMLDivElement>(null);
  // Anteprime da caricare: la scelta e le vicine subito, le altre quando entrano nel carosello.
  // Il caricamento nativo (loading="lazy") nel carosello orizzontale non le caricava affatto.
  const [ready, setReady] = useState<Set<string>>(() => new Set());
  // Stato di pausa letto dal timer: tenuto in un ref, così il timer non si riavvia a ogni passaggio del mouse.
  const pause = useRef({ hover: false, focus: false, until: 0 });

  useEffect(() => {
    const idx = templates.findIndex((t) => t.id === selectedId);
    const near = templates.slice(Math.max(0, idx - 2), idx + 3).map((t) => t.id);
    setReady((prev) => new Set([...prev, ...near]));
  }, [selectedId, templates]);

  useEffect(() => {
    const el = track.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setReady(new Set(templates.map((t) => t.id)));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        const ids = entries.filter((e) => e.isIntersecting).map((e) => (e.target as HTMLElement).dataset.id ?? "");
        if (ids.length) setReady((prev) => new Set([...prev, ...ids]));
      },
      { root: el, rootMargin: "0px 400px" },
    );
    el.querySelectorAll<HTMLElement>(".tpl-card").forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [templates]);

  // Scorrimento automatico: avanza di una diapositiva alla volta e ricomincia dall'inizio. Si ferma se l'utente lo tocca, lo sfiora o ha il focus.
  useEffect(() => {
    const el = track.current;
    if (!el || templates.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      const p = pause.current;
      if (document.hidden || p.hover || p.focus || Date.now() < p.until) return;
      const cards = el.querySelectorAll<HTMLElement>(".tpl-card");
      const step = cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : 0;
      if (!step) return;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) el.scrollTo({ left: 0, behavior: "auto" });
      else el.scrollBy({ left: step, behavior: "smooth" });
    }, STEP_MS);
    return () => window.clearInterval(timer);
  }, [templates]);

  // Quando cambia il template scelto, il carosello si posiziona su di lui.
  useEffect(() => {
    const el = track.current;
    const card = el?.querySelector<HTMLElement>(".tpl-card.is-on");
    if (!el || !card) return;
    el.scrollTo({ left: card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2, behavior: "smooth" });
    // Le anteprime fuori schermo restano spesso non dipinte finché il carosello non si muove: un micro-scorrimento le fa comparire.
    const nudge = window.setTimeout(() => { el.scrollBy({ left: 1 }); el.scrollBy({ left: -1 }); }, 700);
    return () => window.clearTimeout(nudge);
  }, [selectedId]);

  function holdAutoplay() {
    pause.current.until = Date.now() + RESUME_MS;
  }

  function scrollBy(dir: 1 | -1) {
    const el = track.current;
    if (!el) return;
    holdAutoplay();
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.8), behavior: "smooth" });
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowRight") { e.preventDefault(); scrollBy(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); scrollBy(-1); }
  }

  return (
    <div
      className={`tpl-carousel${size === "lg" ? " is-lg" : ""}`}
      role="region"
      aria-roledescription="carosello"
      aria-label={label}
      onPointerEnter={() => { pause.current.hover = true; }}
      onPointerLeave={() => { pause.current.hover = false; }}
      onFocus={() => { pause.current.focus = true; }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) pause.current.focus = false; }}
    >
      <div
        className="tpl-track"
        ref={track}
        tabIndex={0}
        onKeyDown={onKey}
        onPointerDown={holdAutoplay}
        onTouchStart={holdAutoplay}
        onWheel={holdAutoplay}
      >
        {templates.map((t, i) => {
          const on = t.id === selectedId;
          const name = themeCopy(t.id, t.name, lang);
          return (
            <article key={t.id} data-id={t.id} className={`tpl-card${on ? " is-on" : ""}`} aria-roledescription="diapositiva" aria-label={`${i + 1} / ${templates.length}: ${name}`}>
              <div className="tpl-phone">
                <div className="tpl-screen">
                  <iframe title={name} src={ready.has(t.id) ? `/api/themes/${t.id}/demo` : undefined} scrolling="no" sandbox="allow-scripts" tabIndex={-1} aria-hidden="true" />
                </div>
                <button type="button" className="tpl-hit" aria-pressed={on} aria-label={`${name}: ${L.tplUse}`} title={on ? L.tplChosen : L.tplUse} onClick={() => onSelect(t.id)} />
              </div>
              <div className="tpl-meta">
                <h3>{name}</h3>
                {on && <span className="tpl-chosen">{L.tplChosen}</span>}
                <p>{t.description}</p>
              </div>
            </article>
          );
        })}
      </div>
      <div className="tpl-nav">
        <button type="button" className="btn outline small" aria-label={L.tplPrev} onClick={() => scrollBy(-1)}>←</button>
        <span className="tpl-count">{templates.findIndex((t) => t.id === selectedId) + 1} / {templates.length}</span>
        <button type="button" className="btn outline small" aria-label={L.tplNext} onClick={() => scrollBy(1)}>→</button>
      </div>
    </div>
  );
}
