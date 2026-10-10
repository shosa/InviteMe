"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { Countdown } from "./Countdown";

type Props = { names: string; day: string; month: string; year: string; target: string; photo: string };

// Composizione della hero a elementi: arco con i nomi, badge della data, countdown e foto.
// Ogni elemento ha una profondità: con lo scroll si muovono a velocità diverse, come un'esplosione lenta.
export function HeroScene({ names, day, month, year, target, photo }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // -1 quando la scena è in fondo alla finestra, +1 quando è in cima.
      const p = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / vh));
      el.style.setProperty("--p", p.toFixed(3));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // La profondità (--d) decide direzione e ampiezza dello spostamento di ogni elemento.
  const depth = (d: number) => ({ "--d": d }) as CSSProperties;

  return (
    <div className="scene stage-enter" ref={ref} aria-label="Esempio di invito">
      <div className="scene-arch" style={depth(0.25)}>
        <span className="scene-names">{names}</span>
      </div>
      <div className="scene-badge" style={depth(-0.45)}>
        <b>{day}</b>
        <span>
          {month}
          <br />
          {year}
        </span>
      </div>
      <div className="scene-count" style={depth(0.6)}>
        <Countdown target={target} />
      </div>
      <div className="scene-photo" style={depth(-0.3)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt="" />
      </div>
    </div>
  );
}
