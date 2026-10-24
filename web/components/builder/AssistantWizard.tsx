"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Baby, CalendarDays, Check, ClipboardCheck, Clock, Heart, ImagePlus, MapPin, Music, Shirt, Sparkles, Users, Wand2, type LucideIcon } from "lucide-react";

// Percorso guidato «Creiamolo insieme»: fa le domande una alla volta e compone un unico messaggio per l'assistente.
// L'assistente riceve tutto insieme e applica le modifiche in un solo giro (Ctrl+Z le ritira tutte).

type Lang = "it" | "en";

const COLORS = [
  { hex: "#A9B29B", it: "Salvia", en: "Sage" },
  { hex: "#7A1F2B", it: "Borgogna", en: "Burgundy" },
  { hex: "#B8924A", it: "Oro", en: "Gold" },
  { hex: "#F3EBDD", it: "Avorio", en: "Ivory" },
  { hex: "#1D1B19", it: "Nero", en: "Black" },
];

const BACKGROUNDS: { kind: string; icon: LucideIcon; it: string; en: string }[] = [
  { kind: "petals", icon: Sparkles, it: "Petali", en: "Petals" },
  { kind: "sparkles", icon: Wand2, it: "Scintille", en: "Sparkles" },
  { kind: "confetti", icon: Heart, it: "Coriandoli", en: "Confetti" },
  { kind: "none", icon: Check, it: "Niente", en: "None" },
];

const GUEST_QUESTIONS = [
  { id: "count", icon: Users, it: "Quante persone vengono", en: "How many people are coming" },
  { id: "allergy", icon: Heart, it: "Allergie o intolleranze", en: "Allergies or intolerances" },
  { id: "highchair", icon: Baby, it: "Serve il seggiolone", en: "Need a high chair" },
];

type Answers = {
  names: string;
  date: string;
  time: string;
  venue: string;
  dress: string;
  colors: string[];
  background: string;
  questions: string[];
  photo: string;
  music: boolean;
};

const EMPTY: Answers = { names: "", date: "", time: "", venue: "", dress: "", colors: [], background: "", questions: [], photo: "", music: false };

const STEPS = [
  { it: "Evento", en: "Event", icon: CalendarDays },
  { it: "Luogo", en: "Venue", icon: MapPin },
  { it: "Stile", en: "Style", icon: Shirt },
  { it: "Conferma", en: "RSVP", icon: ClipboardCheck },
  { it: "Foto e musica", en: "Photo & music", icon: ImagePlus },
];

// Il messaggio che l'assistente riceve: solo ciò che la persona ha risposto.
export function composeBrief(a: Answers, lang: Lang): string {
  const it = lang === "it";
  const lines: string[] = [it ? "Creiamo l'invito con questi dati." : "Let's create the invitation with these details."];
  if (a.names) lines.push(`${it ? "Nomi" : "Names"}: ${a.names}`);
  if (a.date) lines.push(`${it ? "Data" : "Date"}: ${a.date}`);
  if (a.time) lines.push(`${it ? "Ora" : "Time"}: ${a.time}`);
  if (a.venue) lines.push(`${it ? "Luogo" : "Venue"}: ${a.venue} (${it ? "cerca l'indirizzo e fammelo scegliere" : "find the address and let me choose it"})`);
  if (a.dress || a.colors.length) lines.push(`${it ? "Dress code" : "Dress code"}: ${[a.dress, a.colors.join(", ")].filter(Boolean).join(" · ")}`);
  if (a.background) lines.push(`${it ? "Sfondo" : "Background"}: ${a.background}`);
  if (a.questions.length) lines.push(`${it ? "Domande per chi risponde" : "Questions for guests"}: ${a.questions.join("; ")}`);
  if (a.photo) lines.push(`${it ? "Foto nell'intestazione" : "Header photo"}: ${a.photo}`);
  lines.push(a.music ? (it ? "Musica: sì, dalla libreria." : "Music: yes, from the library.") : it ? "Musica: nessuna per ora." : "Music: none for now.");
  return lines.join("\n");
}

export function AssistantWizard({ lang, onCompose, onCancel }: { lang: Lang; onCompose: (brief: string) => void; onCancel: () => void }) {
  const it = lang === "it";
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>(EMPTY);
  const set = <K extends keyof Answers>(k: K, v: Answers[K]) => setA((x) => ({ ...x, [k]: v }));
  const last = step === STEPS.length - 1;
  const toggle = <T extends string>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <div className="aw">
      <div className="aw-track" role="list" aria-label={it ? "Passi" : "Steps"}>
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const state = i < step ? "done" : i === step ? "current" : "todo";
          return (
            <div key={s.it} role="listitem" className={`aw-step is-${state}`} aria-current={state === "current" ? "step" : undefined}>
              <span className="aw-dot">{state === "done" ? <Check size={14} aria-hidden="true" /> : <Icon size={14} aria-hidden="true" />}</span>
              <span className="aw-label">{it ? s.it : s.en}</span>
            </div>
          );
        })}
        <span className="aw-bar" style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} aria-hidden="true" />
      </div>

      <div key={step} className="aw-card">
        {step === 0 && (
          <>
            <h3 className="aw-q">{it ? "Chi si sposa, o chi festeggia?" : "Who is getting married, or who is celebrating?"}</h3>
            <label className="aw-field">
              <span>{it ? "Nomi" : "Names"}</span>
              <input value={a.names} placeholder={it ? "Es. Marco & Anna" : "E.g. Marco & Anna"} onChange={(e) => set("names", e.target.value)} />
            </label>
            <div className="aw-row">
              <label className="aw-field">
                <span>{it ? "Data" : "Date"}</span>
                <input type="date" value={a.date} onChange={(e) => set("date", e.target.value)} />
              </label>
              <label className="aw-field">
                <span>{it ? "Ora" : "Time"}</span>
                <input type="time" value={a.time} onChange={(e) => set("time", e.target.value)} />
              </label>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h3 className="aw-q">{it ? "Dove si festeggia?" : "Where is the celebration?"}</h3>
            <label className="aw-field">
              <span>{it ? "Luogo" : "Venue"}</span>
              <input value={a.venue} placeholder={it ? "Es. Villa Zaira, Maglie" : "E.g. Villa Zaira, Maglie"} onChange={(e) => set("venue", e.target.value)} />
            </label>
            <p className="aw-hint">{it ? "Non serve l'indirizzo esatto: lo cerco io e tu scegli tra le opzioni." : "No need for the exact address: I'll look it up and you pick from the options."}</p>
          </>
        )}

        {step === 2 && (
          <>
            <h3 className="aw-q">{it ? "Che atmosfera vuoi?" : "What atmosphere do you want?"}</h3>
            <label className="aw-field">
              <span>{it ? "Dress code" : "Dress code"}</span>
              <input value={a.dress} placeholder={it ? "Es. Eleganza naturale" : "E.g. Natural elegance"} onChange={(e) => set("dress", e.target.value)} />
            </label>
            <div className="aw-chips" role="group" aria-label={it ? "Colori" : "Colours"}>
              {COLORS.map((c) => {
                const on = a.colors.includes(c.hex);
                return (
                  <button key={c.hex} type="button" className={`aw-swatch${on ? " is-on" : ""}`} aria-pressed={on} onClick={() => set("colors", toggle(a.colors, c.hex))}>
                    <span className="aw-color" style={{ background: c.hex }} aria-hidden="true" />
                    {it ? c.it : c.en}
                  </button>
                );
              })}
            </div>
            <p className="aw-sub">{it ? "Sfondo animato" : "Animated background"}</p>
            <div className="aw-chips" role="radiogroup" aria-label={it ? "Sfondo" : "Background"}>
              {BACKGROUNDS.map((b) => {
                const Icon = b.icon;
                const on = a.background === b.kind;
                return (
                  <button key={b.kind} type="button" role="radio" aria-checked={on} className={`aw-pick${on ? " is-on" : ""}`} onClick={() => set("background", b.kind)}>
                    <Icon size={16} aria-hidden="true" />
                    {it ? b.it : b.en}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h3 className="aw-q">{it ? "Cosa vuoi chiedere a chi risponde?" : "What do you want to ask guests?"}</h3>
            <div className="aw-chips" role="group" aria-label={it ? "Domande" : "Questions"}>
              {GUEST_QUESTIONS.map((q) => {
                const Icon = q.icon;
                const on = a.questions.includes(q.id);
                return (
                  <button key={q.id} type="button" className={`aw-pick${on ? " is-on" : ""}`} aria-pressed={on} onClick={() => set("questions", toggle(a.questions, q.id))}>
                    <Icon size={16} aria-hidden="true" />
                    {it ? q.it : q.en}
                  </button>
                );
              })}
            </div>
            <p className="aw-hint">{it ? "Scegli quelle che ti servono: le preparo nel modulo di conferma." : "Pick the ones you need: I'll set them up in the RSVP form."}</p>
          </>
        )}

        {step === 4 && (
          <>
            <h3 className="aw-q">{it ? "Ultimo passo: foto e musica" : "Last step: photo and music"}</h3>
            <label className="aw-field">
              <span>{it ? "Foto di copertina (che soggetto?)" : "Cover photo (what subject?)"}</span>
              <input value={a.photo} placeholder={it ? "Es. tramonto sul mare" : "E.g. sunset over the sea"} onChange={(e) => set("photo", e.target.value)} />
            </label>
            <div className="aw-chips" role="group" aria-label={it ? "Musica" : "Music"}>
              <button type="button" className={`aw-pick${a.music ? " is-on" : ""}`} aria-pressed={a.music} onClick={() => set("music", !a.music)}>
                <Music size={16} aria-hidden="true" />
                {it ? "Sì, metti una musica" : "Yes, add music"}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="aw-nav">
        <button type="button" className="aw-back" onClick={() => (step === 0 ? onCancel() : setStep(step - 1))}>
          <ArrowLeft size={16} aria-hidden="true" />
          {step === 0 ? (it ? "Annulla" : "Cancel") : it ? "Indietro" : "Back"}
        </button>
        {last ? (
          <button type="button" className="aw-next aw-go" onClick={() => onCompose(composeBrief(a, lang))}>
            <Wand2 size={16} aria-hidden="true" />
            {it ? "Componi l'invito" : "Compose the invitation"}
          </button>
        ) : (
          <button type="button" className="aw-next" onClick={() => setStep(step + 1)}>
            {it ? "Avanti" : "Next"}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
