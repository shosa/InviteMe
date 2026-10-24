"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowRight, CalendarDays, ClipboardCheck, ImagePlus, MapPin, Music, Palette, Shirt, Sparkles, Wand2, type LucideIcon } from "lucide-react";
import { AssistantWizard } from "./AssistantWizard";
import type { Action } from "@inviteme/shared";

// Chat dell'assistente nel builder: il cliente scrive, il server propone modifiche già validate.
// Le modifiche si applicano dal builder in un solo passo di cronologia: Annulla (Ctrl+Z) le ritira tutte.
type Choice = { question: string; options: string[]; answered?: boolean };
type Line = { role: "user" | "assistant"; text: string; error?: boolean; applied?: number; choice?: Choice };

// Richieste di partenza: un clic le scrive nel campo, poi si invia (o si modifica prima).
const IDEAS_IT: { text: string; icon: LucideIcon }[] = [
  { text: "Cambia la data e l'ora", icon: CalendarDays },
  { text: "Trova l'indirizzo del luogo", icon: MapPin },
  { text: "Metti il dress code con i colori", icon: Shirt },
  { text: "Imposta le domande per chi risponde", icon: ClipboardCheck },
  { text: "Cambia lo sfondo con i petali", icon: Sparkles },
  { text: "Metti una foto nell'intestazione", icon: ImagePlus },
  { text: "Metti una musica di sottofondo", icon: Music },
  { text: "Cambia i colori dell'invito", icon: Palette },
];
const IDEAS_EN: { text: string; icon: LucideIcon }[] = [
  { text: "Change the date and time", icon: CalendarDays },
  { text: "Find the address of the venue", icon: MapPin },
  { text: "Set the dress code with colours", icon: Shirt },
  { text: "Set the questions for guests", icon: ClipboardCheck },
  { text: "Change the background to petals", icon: Sparkles },
  { text: "Put a photo in the header", icon: ImagePlus },
  { text: "Add background music", icon: Music },
  { text: "Change the colours of the invitation", icon: Palette },
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
  const [wizardOpen, setWizardOpen] = useState(false);
  // Indirizzi proposti finora: il server li riconosce anche nelle richieste successive.
  const [offered, setOffered] = useState<string[]>([]);

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
        body: JSON.stringify({ messages, placesAllowed: offered }),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string; actions?: Action[]; remaining?: number; mediaAllowed?: string[]; placesAllowed?: string[]; choice?: Choice; error?: string };
      if (!res.ok || typeof data.reply !== "string") throw new Error(data.error ?? (it ? "L'assistente non risponde." : "The assistant is not responding."));
      if (data.placesAllowed?.length) setOffered((o) => [...new Set([...o, ...(data.placesAllowed ?? [])])].slice(-30));
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
      <div className="as-body">
      <div className="bl-tabs-head">
        <span className="bl-kicker">Chat</span>
        <h2>{it ? "Assistente" : "Assistant"}</h2>
      </div>

      <div className="as-counter" aria-live="polite">
        <span>{it ? "Richieste disponibili" : "Requests left"}</span>
        <strong key={remaining} className="as-tick">
          {remaining} / {limit}
        </strong>
      </div>

      {lines.length === 0 && !readOnly && !wizardOpen && (
        <div className="as-start">
          <button type="button" className="as-cta" onClick={() => setWizardOpen(true)}>
            <span className="as-cta-ico">
              <Wand2 size={22} aria-hidden="true" />
            </span>
            <span className="as-cta-text">
              <strong>{it ? "Creiamolo insieme" : "Let's create it together"}</strong>
              <small>{it ? "Ti faccio qualche domanda, poi compongo l'invito" : "I'll ask a few questions, then compose the invitation"}</small>
            </span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>
          <p className="as-ideas-title">{it ? "Oppure chiedi direttamente:" : "Or ask directly:"}</p>
          <div className="as-ideas" aria-label={it ? "Richieste" : "Requests"}>
            {(it ? IDEAS_IT : IDEAS_EN).map((idea) => {
              const Icon = idea.icon;
              return (
                <button key={idea.text} type="button" className="as-idea" onClick={() => setDraft(idea.text)}>
                  <span className="as-idea-ico">
                    <Icon size={15} aria-hidden="true" />
                  </span>
                  {idea.text}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {wizardOpen && !readOnly && (
        <AssistantWizard
          lang={lang}
          onCancel={() => setWizardOpen(false)}
          onCompose={(brief) => {
            setWizardOpen(false);
            void send(brief);
          }}
        />
      )}
      {lines.length === 0 && !wizardOpen && (
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
          rows={2}
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
