"use client";

import { useState, type FormEvent } from "react";
import type { RsvpQuestion } from "@inviteme/shared";

type Answers = Record<string, string | number | boolean>;

// Modulo di conferma: le domande sono quelle configurate dal proprietario dell'invito.
export function RsvpForm({ slug, questions }: { slug: string; questions: RsvpQuestion[] }) {
  const [answers, setAnswers] = useState<Answers>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const set = (id: string, value: string | number | boolean) => setAnswers((a) => ({ ...a, [id]: value }));

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, answers }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Invio non riuscito");
      }
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invio non riuscito. Riprova tra poco.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <section className="rsvp rsvp-done" aria-live="polite" data-reveal>
        <h2>Grazie, abbiamo ricevuto la tua risposta</h2>
        <p>Non vediamo l&apos;ora di festeggiare insieme.</p>
      </section>
    );
  }

  return (
    <section className="rsvp" data-reveal>
      <p className="inv-label">Conferma di presenza</p>
      <h2>Ci sarai?</h2>
      <form onSubmit={submit} className="rsvp-form">
        {questions.map((q) => (
          <fieldset key={q.id} className="rsvp-field">
            <legend>{q.label}</legend>
            {q.type === "yes-no" && (
              <div className="rsvp-choice">
                <button type="button" aria-pressed={answers[q.id] === true} onClick={() => set(q.id, true)}>Sì, ci sarò</button>
                <button type="button" aria-pressed={answers[q.id] === false} onClick={() => set(q.id, false)}>Non potrò</button>
              </div>
            )}
            {q.type === "choice" && (
              <div className="rsvp-choice rsvp-choice--many">
                {(q.options ?? []).map((o) => (
                  <button key={o} type="button" aria-pressed={answers[q.id] === o} onClick={() => set(q.id, o)}>{o}</button>
                ))}
              </div>
            )}
            {q.type === "number" && (
              <input type="number" min={1} max={20} inputMode="numeric" aria-label={q.label} value={String(answers[q.id] ?? "")} onChange={(e) => set(q.id, Number(e.target.value))} />
            )}
            {q.type === "text" && (
              <textarea rows={2} aria-label={q.label} value={String(answers[q.id] ?? "")} onChange={(e) => set(q.id, e.target.value)} />
            )}
          </fieldset>
        ))}
        <button className="rsvp-submit" type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Invio…" : "Invia la conferma"}
        </button>
        {error && <p role="alert" className="rsvp-error">{error}</p>}
      </form>
    </section>
  );
}
