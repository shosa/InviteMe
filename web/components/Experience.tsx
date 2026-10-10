"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { monogram } from "./Invitation";

type Props = {
  title: string;
  accent: string;
  paper: string;
  ink: string;
  musicSrc?: string | null;
  cover?: boolean; // false: nessuna busta, l'invito è subito visibile (anteprime)
  children: ReactNode;
};

const reduceMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Busta sigillata: il tocco la apre, parte la musica e l'invito si rivela.
export function Experience({ title, accent, paper, ink, musicSrc, cover = true, children }: Props) {
  const [stage, setStage] = useState<"sealed" | "opening" | "open">(cover ? "sealed" : "open");
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);

  // Blocca lo scroll finché la busta è chiusa.
  useEffect(() => {
    if (!cover) return;
    document.body.classList.toggle("is-sealed", stage !== "open");
    return () => document.body.classList.remove("is-sealed");
  }, [stage, cover]);

  // Rivelazione allo scroll: ogni blocco entra con un leggero movimento.
  useEffect(() => {
    if (stage !== "open") return;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (reduceMotion() || !("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12 },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [stage]);

  function open() {
    if (!cover || stage !== "sealed") return;
    setStage("opening");
    if (musicSrc && audio.current) {
      audio.current.volume = 0.7;
      audio.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
    window.setTimeout(() => setStage("open"), reduceMotion() ? 0 : 1100);
  }

  function toggleMusic() {
    if (!audio.current) return;
    if (audio.current.paused) audio.current.play().then(() => setPlaying(true)).catch(() => undefined);
    else {
      audio.current.pause();
      setPlaying(false);
    }
  }

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  };

  const vars = { "--exp-accent": accent, "--exp-paper": paper, "--exp-ink": ink } as CSSProperties;

  return (
    <div className={`experience stage-${stage}`} style={vars}>
      <Petals color={accent} active={stage !== "sealed"} />

      {cover && stage !== "open" && (
        <div className="cover" role="button" tabIndex={0} aria-label={`Apri l'invito di ${title}`} onClick={open} onKeyDown={onKey}>
          <div className="env">
            <div className="env-body" />
            <div className="env-flap" />
            <div className="env-seal" aria-hidden>
              <span>{monogram(title)}</span>
            </div>
            <div className="env-lines" aria-hidden />
          </div>
          <p className="cover-hint">Tocca per aprire</p>
        </div>
      )}

      {musicSrc && (
        <>
          <audio ref={audio} src={musicSrc} loop preload="auto" onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} />
          {stage === "open" && (
            <button type="button" className="music-toggle" onClick={toggleMusic} aria-pressed={playing} aria-label={playing ? "Metti in pausa la musica" : "Riproduci la musica"}>
              <span className={playing ? "bars is-on" : "bars"} aria-hidden><i /><i /><i /></span>
              {playing ? "Pausa" : "Musica"}
            </button>
          )}
        </>
      )}

      <div className="experience-body">{children}</div>
    </div>
  );
}

// Petali sul fondo: pochi, lenti, nel colore dell'accento. Si fermano con la riduzione del movimento.
function Petals({ color, active }: { color: string; active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !active || reduceMotion()) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const count = w < 600 ? 14 : 24;
    const parts = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 4 + Math.random() * 5,
      vy: 0.25 + Math.random() * 0.45,
      sway: 0.4 + Math.random() * 0.8,
      phase: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI,
    }));
    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = color;
      for (const p of parts) {
        p.y += p.vy;
        p.phase += 0.01;
        const x = p.x + Math.sin(p.phase) * 18 * p.sway;
        if (p.y > h + 12) {
          p.y = -12;
          p.x = Math.random() * w;
        }
        ctx.globalAlpha = 0.16 + 0.12 * Math.sin(t / 1500 + p.phase);
        ctx.beginPath();
        ctx.ellipse(x, p.y, p.r, p.r * 0.55, p.rot + Math.sin(p.phase) * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [color, active]);
  return <canvas ref={ref} className="petals" aria-hidden />;
}
