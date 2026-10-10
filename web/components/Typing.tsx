"use client";

import { useEffect, useState } from "react";

// Frase che si scrive lettera per lettera, resta un attimo, si cancella e passa alla successiva.
// Con la riduzione del movimento attiva mostra la prima frase intera, senza animazione.
export function Typing({ phrases }: { phrases: string[] }) {
  const [text, setText] = useState(phrases[0] ?? "");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || phrases.length === 0) return;
    let idx = 0;
    let count = 0;
    let mode: "type" | "hold" | "erase" = "type";
    let timer = 0;
    setText("");

    const step = () => {
      const phrase = phrases[idx];
      if (mode === "type") {
        count += 1;
        setText(phrase.slice(0, count));
        if (count === phrase.length) {
          mode = "hold";
          timer = window.setTimeout(step, 2200);
        } else timer = window.setTimeout(step, 55);
      } else if (mode === "hold") {
        mode = "erase";
        timer = window.setTimeout(step, 30);
      } else {
        count -= 1;
        setText(phrase.slice(0, count));
        if (count === 0) {
          mode = "type";
          idx = (idx + 1) % phrases.length;
          timer = window.setTimeout(step, 380);
        } else timer = window.setTimeout(step, 26);
      }
    };
    timer = window.setTimeout(step, 500);
    return () => window.clearTimeout(timer);
  }, [phrases]);

  return (
    <span className="typing">
      <span className="sr-only">{phrases[0]}</span>
      <span aria-hidden="true">{text}</span>
      <span className="caret" aria-hidden="true" />
    </span>
  );
}
