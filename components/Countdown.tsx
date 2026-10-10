"use client";

import { useEffect, useState } from "react";

function remaining(target: number) {
  const diff = Math.max(0, target - Date.now());
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    done: diff === 0,
  };
}

// Conto alla rovescia reale: si aggiorna ogni secondo e si ferma all'arrivo dell'evento.
export function Countdown({ target }: { target: string }) {
  const at = new Date(target).getTime();
  const [now, setNow] = useState<ReturnType<typeof remaining> | null>(null);

  useEffect(() => {
    if (Number.isNaN(at)) return;
    const tick = () => setNow(remaining(at));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [at]);

  if (Number.isNaN(at)) return null;
  if (!now) return <div className="inv-countdown" aria-hidden />;
  if (now.done) return <p className="inv-countdown-done">È il grande giorno!</p>;

  const units = [
    ["giorni", now.days],
    ["ore", now.hours],
    ["min", now.minutes],
    ["sec", now.seconds],
  ] as const;

  return (
    <div className="inv-countdown" role="timer" aria-label="Tempo mancante all'evento">
      {units.map(([label, value]) => (
        <div key={label} className="inv-cd-unit">
          <span>{String(value).padStart(2, "0")}</span>
          <small>{label}</small>
        </div>
      ))}
    </div>
  );
}
