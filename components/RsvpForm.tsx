"use client";

import { useState, type FormEvent } from "react";
import type { RsvpQuestion } from "@/lib/invitation";

type Answers = Record<string, string | number | boolean>;

// Form RSVP: ogni domanda è configurata dal proprietario dell'invito nel builder.
export function RsvpForm({ slug, questions }: { slug: string; questions: RsvpQuestion[] }) {
  const [answers, setAnswers] = useState<Answers>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  function set(id: string, value: string | number | boolean) {
    setAnswers((a) => ({ ...a, [id]: value }));
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, answers }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <section className="rsvp rsvp-done" aria-live="polite">
        <h2>Grazie, abbiamo ricevuto la tua risposta</h2>
        <p>Ci vediamo presto.</p>
      </section>
    );
  }

  return (
    <section className="rsvp">
      <h2>Confermi la tua presenza?</h2>
      <form onSubmit={submit}>
        {questions.map((q) => (
          <fieldset key={q.id} className="rsvp-field">
            <legend>{q.label}</legend>
            {q.type === "yes-no" && (
              <div className="rsvp-choice">
                <button type="button" aria-pressed={answers[q.id] === true} onClick={() => set(q.id, true)}>
                  Sì, ci sarò
                </button>
                <button type="button" aria-pressed={answers[q.id] === false} onClick={() => set(q.id, false)}>
                  Non potrò
                </button>
              </div>
            )}
            {q.type === "number" && (
              <input
                type="number"
                min={1}
                max={20}
                inputMode="numeric"
                value={String(answers[q.id] ?? "")}
                onChange={(e) => set(q.id, Number(e.target.value))}
                aria-label={q.label}
              />
            )}
            {q.type === "text" && (
              <textarea
                rows={3}
                value={String(answers[q.id] ?? "")}
                onChange={(e) => set(q.id, e.target.value)}
                aria-label={q.label}
              />
            )}
          </fieldset>
        ))}
        <button className="rsvp-submit" type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Invio…" : "Invia risposta"}
        </button>
        {status === "error" && <p role="alert" className="rsvp-error">Non è stato possibile inviare. Riprova.</p>}
      </form>
    </section>
  );
}
