"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Action } from "@inviteme/shared";

// Chat dell'assistente nel builder: il cliente scrive, il server propone modifiche già validate.
// Le modifiche si applicano dal builder in un solo passo di cronologia: Annulla (Ctrl+Z) le ritira tutte.
type Choice = { question: string; options: string[]; answered?: boolean };
type Line = { role: "user" | "assistant"; text: string; error?: boolean; applied?: number; choice?: Choice };

// Richieste di partenza: un clic le scrive nel campo, poi si invia (o si modifica prima).
const IDEAS_IT = [
  "Cambia la data e l'ora del matrimonio",
  "Trova l'indirizzo del luogo",
  "Metti il dress code con i colori",
  "Imposta le domande per chi risponde",
  "Cambia lo sfondo con i petali",
  "Metti una foto nell'intestazione",
  "Metti una musica di sottofondo",
  "Nascondi un blocco dell'invito",
];
const IDEAS_EN = [
  "Change the date and time of the wedding",
  "Find the address of the venue",
  "Set the dress code with colours",
  "Set the questions for guests",
  "Change the background to petals",
  "Put a photo in the header",
  "Add background music",
  "Hide a block of the invitation",
];

// Solo questi elementi dal markdown della risposta: niente titoli, immagini o link.
const ALLOWED = ["p", "strong", "em", "ul", "ol", "li", "br"];

export function AssistantPanel({
  lang,
  invitationId,
  readOnly,
  limit,
  used,
  onApply,
}: {
  lang: "it" | "en";
  invitationId: string;
  readOnly: boolean;
  limit: number;
  used: number;
  onApply: (actions: Action[], allowed: { mediaAllowed: string[]; placesAllowed: string[] }) => number;
}) {
  const it = lang !== "en";
  const [lines, setLines] = useState<Line[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(Math.max(0, limit - used));
  const out = remaining <= 0;

  const [picks, setPicks] = useState<Record<number, string>>({});

  async function send(override?: string, answeredAt?: number) {
    const text = (override ?? draft).trim();
    if (!text || busy || out) return;
    const base = answeredAt === undefined ? lines : lines.map((x, j) => (j === answeredAt && x.choice ? { ...x, choice: { ...x.choice, answered: true } } : x));
    const next: Line[] = [...base, { role: "user", text }];
    setLines(next);
    setDraft("");
    setBusy(true);
    try {
      // Solo il testo della conversazione: niente risposte d'errore, al massimo le ultime dodici voci.
      const messages = next.filter((l) => !l.error).slice(-12).map((l) => ({ role: l.role, content: l.text }));
      const res = await fetch(`/api/invitations/${invitationId}/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string; actions?: Action[]; remaining?: number; mediaAllowed?: string[]; placesAllowed?: string[]; choice?: Choice; error?: string };
      if (!res.ok || typeof data.reply !== "string") throw new Error(data.error ?? (it ? "L'assistente non risponde." : "The assistant is not responding."));
      const applied = data.actions?.length ? onApply(data.actions, { mediaAllowed: data.mediaAllowed ?? [], placesAllowed: data.placesAllowed ?? [] }) : 0;
      if (typeof data.remaining === "number") setRemaining(data.remaining);
      setLines((l) => [...l, { role: "assistant", text: data.reply ?? "", applied, ...(data.choice ? { choice: { ...data.choice } } : {}) }]);
    } catch (e) {
      setLines((l) => [...l, { role: "assistant", text: e instanceof Error ? e.message : "Errore", error: true }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bl-inspector as-panel">
      <div className="bl-tabs-head">
        <span className="bl-kicker">Chat</span>
        <h2>{it ? "Assistente" : "Assistant"}</h2>
      </div>

      <div className="as-counter" aria-live="polite">
        <span>{it ? "Richieste disponibili" : "Requests left"}</span>
        <strong>
          {remaining} / {limit}
        </strong>
      </div>

      {lines.length === 0 && !readOnly && (
        <div className="as-ideas" aria-label={it ? "Cose che puoi chiedere" : "Things you can ask"}>
          <p className="as-ideas-title">{it ? "Puoi chiedermi, per esempio:" : "You can ask me, for example:"}</p>
          {(it ? IDEAS_IT : IDEAS_EN).map((idea) => (
            <button key={idea} type="button" className="as-idea" onClick={() => { setDraft(idea); }}>
              {idea}
            </button>
          ))}
        </div>
      )}
      {lines.length === 0 && (
        <p className="as-hint">
          {readOnly
            ? it
              ? "L'invito è confermato: l'assistente risponde, ma non modifica più nulla."
              : "The invitation is confirmed: the assistant answers but no longer changes anything."
            : it
              ? "Scrivi cosa vuoi cambiare, con parole tue: «sposta il countdown sopra il programma», «metti il dress code salvia e borgogna»."
              : "Write what you want to change, in your own words: “move the countdown above the program”, “set the dress code to sage and burgundy”."}
        </p>
      )}

      <div className="as-log" aria-live="polite">
        {lines.map((l, i) => (
          <div key={i} className={`as-msg${l.role === "user" ? " is-user" : ""}${l.error ? " is-error" : ""}`}>
            {l.role === "user" ? (
              <p>{l.text}</p>
            ) : (
              <div className="as-md">
                <ReactMarkdown allowedElements={ALLOWED} unwrapDisallowed>
                  {l.text}
                </ReactMarkdown>
              </div>
            )}
            {l.choice && (
              <fieldset className="as-choice" disabled={l.choice.answered || busy || out}>
                <legend>{l.choice.question}</legend>
                {l.choice.options.map((o) => (
                  <label key={o} className="as-radio">
                    <input type="radio" name={`choice-${i}`} value={o} checked={picks[i] === o} disabled={l.choice?.answered || busy || out} onChange={() => setPicks((p) => ({ ...p, [i]: o }))} />
                    <span>{o}</span>
                  </label>
                ))}
                {!l.choice.answered && (
                  <button
                    type="button"
                    className="btn solid as-choice-send"
                    disabled={!picks[i]}
                    onClick={() => {
                      void send(picks[i], i);
                    }}
                  >
                    {it ? "Conferma" : "Confirm"}
                  </button>
                )}
              </fieldset>
            )}
            {l.applied ? <p className="as-applied">{it ? `Modifiche applicate: ${l.applied}. Annulla (Ctrl+Z) le ritira.` : `Changes applied: ${l.applied}. Undo (Ctrl+Z) reverts them.`}</p> : null}
          </div>
        ))}
        {busy && (
          <div className="as-thinking" role="status">
            <span className="as-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>{it ? "L'assistente sta pensando" : "The assistant is thinking"}</span>
          </div>
        )}
      </div>

      <form
        className="as-form"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          className="as-input"
          rows={3}
          maxLength={1000}
          value={draft}
          disabled={busy || out}
          placeholder={out ? (it ? "Richieste esaurite per questo invito" : "No requests left for this invitation") : it ? "Scrivi una richiesta…" : "Write a request…"}
          aria-label={it ? "Messaggio per l'assistente" : "Message for the assistant"}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <button type="submit" className="btn solid as-send" disabled={busy || out || draft.trim().length === 0}>
          {it ? "Invia" : "Send"}
        </button>
      </form>
    </div>
  );
}
