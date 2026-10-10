"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { monogram } from "./Invitation";
import { Glyph } from "./Glyph";

type Props = {
  title: string;
  accent: string;
  paper: string;
  ink: string;
  musicSrc?: string | null;
  cover?: boolean; // false: nessuna busta (anteprime)
  reveal?: "fade" | "rise" | "none";
  children: ReactNode;
};

const reduceMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Busta: il tocco la apre, parte la musica e l'invito si rivela. È l'unico momento coreografato.
export function Experience({ title, accent, paper, ink, musicSrc, cover = true, reveal = "fade", children }: Props) {
  const [stage, setStage] = useState<"sealed" | "opening" | "open">(cover ? "sealed" : "open");
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);

  // Blocca lo scroll finché la busta è chiusa.
  useEffect(() => {
    if (!cover) return;
    document.body.classList.toggle("is-sealed", stage !== "open");
    return () => document.body.classList.remove("is-sealed");
  }, [stage, cover]);

  // Rivelazione dei blocchi allo scroll: una sola dissolvenza breve, nessun effetto per sezione.
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
      { threshold: 0.1 },
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
    window.setTimeout(() => setStage("open"), reduceMotion() ? 0 : 1000);
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
    <div className={`experience stage-${stage}`} style={vars} data-reveal-style={reveal}>
      {cover && stage !== "open" && (
        <div className="cover" role="button" tabIndex={0} aria-label={`Apri l'invito di ${title}`} onClick={open} onKeyDown={onKey}>
          <div className="env">
            <div className="env-body" />
            <div className="env-flap" />
            <div className="env-seal" aria-hidden>
              <span>{monogram(title)}</span>
            </div>
          </div>
          <p className="cover-hint">Tocca per aprire</p>
        </div>
      )}

      {musicSrc && (
        <>
          <audio ref={audio} src={musicSrc} loop preload="auto" onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} />
          {stage === "open" && (
            <button type="button" className="music-toggle" onClick={toggleMusic} aria-pressed={playing} aria-label={playing ? "Metti in pausa la musica" : "Riproduci la musica"}>
              <Glyph name="music" />
              <span>{playing ? "In pausa" : "Musica"}</span>
            </button>
          )}
        </>
      )}

      <div className="experience-body">{children}</div>
    </div>
  );
}
