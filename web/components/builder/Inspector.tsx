"use client";

import { EVENT_FIELDS, EVENT_TYPES, blockDef, enabledThemes, type BlockInstance, type Catalog, type EventType, type InviteConfig, type RsvpQuestion } from "@inviteme/shared";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { Field, FieldEditor, type Values } from "./fields";
import { TemplateSwitch } from "./TemplateSwitch";
import { ui } from "@/lib/ui";
import { blockCopy, fieldCopy } from "@/lib/catalogCopy";

// Luogo e indirizzo: con il blocco Mappa si modificano lì, non nel pannello Evento.
const LOCATION_KEYS = ["venue", "address"];

type Props = {
  config: InviteConfig;
  catalog: Catalog;
  block: BlockInstance | null;
  busy: string | null;
  onSetProp: (id: string, key: string, value: unknown, group?: string) => void;
  onSetEvent: (key: string, value: unknown, group?: string) => void;
  onSetTheme: (id: string) => void;
  locked?: boolean;
  onSetLocale: (locale: "it" | "en") => void;
  onSetEventType: (t: EventType) => void;
  onSetQuestions: (q: RsvpQuestion[]) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onBack?: () => void;
  onUpload: (kind: "photo" | "video" | "audio", file: File) => Promise<string | null>;
  lang?: "it" | "en";
};

// Colonna destra: le proprietà del blocco selezionato, oppure i dati generali dell'invito.
export function Inspector(p: Props) {
  const L = ui(p.lang ?? "it").builder;
  if (p.block) {
    const def = blockDef(p.block.type);
    if (!def) return null;
    return (
      <div className="bl-inspector">
        <header className="bl-insp-head">
          <div>
            <p className="bl-kicker">{L.block}</p>
            <h2>{blockCopy(def.type, def.label, p.lang ?? "it")}</h2>
            <p className="hint">{def.description}</p>
          </div>
          {p.onBack && <button type="button" className="bl-back" onClick={p.onBack}>← {L.eventDetails}</button>}
          <div className="bl-insp-actions">
            <button type="button" className="bl-icon" aria-label={p.block.hidden ? L.show : L.hide} onClick={() => p.onToggle(p.block!.id)}>
              {p.block.hidden ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
            <button type="button" className="bl-icon" aria-label={L.remove} onClick={() => p.onRemove(p.block!.id)}>
              <Trash2 size={17} />
            </button>
          </div>
        </header>
        {def.fields.length === 0 && p.block.type !== "map" ? (
          <p className="hint">{L.blockHint}</p>
        ) : (
          <div className="bl-fields">
            {def.fields.map((f) => (
              <FieldEditor
                key={f.key}
                copy={(k, l) => fieldCopy(def.type, k, l, p.lang ?? "it")}
                standard={L.standardStyle}
                field={f}
                value={(p.block!.props as Values)[f.key] ?? def.defaults[f.key]}
                disabledByFeature={false}
                busy={p.busy}
                library={p.catalog.music}
                onChange={(v) => p.onSetProp(p.block!.id, f.key, v, `${p.block!.id}:${f.key}`)}
                onUpload={p.onUpload}
              />
            ))}
          </div>
        )}
        {p.block.type === "map" && (
          <section className="bl-group" aria-labelledby="bl-loc">
            <h3 id="bl-loc">{L.location}</h3>
            <p className="hint">{L.locationHelp}</p>
            <div className="bl-fields">
              {EVENT_FIELDS.filter((f) => LOCATION_KEYS.includes(f.key)).map((f) => (
                <FieldEditor
                  key={f.key}
                  copy={(k, l) => fieldCopy("event", k, l, p.lang ?? "it")}
                  field={f}
                  value={(p.config.event as Values)[f.key]}
                  disabledByFeature={false}
                  busy={p.busy}
                  library={p.catalog.music}
                  onChange={(v) => p.onSetEvent(f.key, v, `event:${f.key}`)}
                  onUpload={p.onUpload}
                />
              ))}
            </div>
          </section>
        )}
        {p.block.type === "rsvp" && <QuestionsEditor questions={p.config.rsvpQuestions} onChange={p.onSetQuestions} L={L} />}
      </div>
    );
  }

  const themes = enabledThemes(p.catalog, p.config.model);
  const hasMap = p.config.blocks.some((b) => b.type === "map");
  return (
    <div className="bl-inspector">
      <header className="bl-insp-head">
        <div>
          <p className="bl-kicker">{L.eventStyle}</p>
          <h2>{L.eventDetails}</h2>
          <p className="hint">{L.selectHint}</p>
        </div>
      </header>

      <section className="bl-group" aria-labelledby="bl-event">
        <h3 id="bl-event">{L.eventDetails}</h3>
        {hasMap && <p className="hint">{L.locationInMap}</p>}
        <div className="bl-fields">
          {EVENT_FIELDS.filter((f) => !(hasMap && LOCATION_KEYS.includes(f.key))).map((f) => (
            <FieldEditor
              key={f.key}
              copy={(k, l) => fieldCopy("event", k, l, p.lang ?? "it")}
              field={f}
              value={(p.config.event as Values)[f.key]}
              disabledByFeature={false}
              busy={p.busy}
              library={p.catalog.music}
              onChange={(v) => p.onSetEvent(f.key, v, `event:${f.key}`)}
              onUpload={p.onUpload}
            />
          ))}
          <Field label={L.eventType}>
            <select value={p.config.eventType} onChange={(e) => p.onSetEventType(e.target.value as EventType)}>
              {EVENT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </Field>
          <Field label={L.pageLang}>
            <select value={p.config.locale} onChange={(e) => p.onSetLocale(e.target.value as "it" | "en")}>
              <option value="it">Italiano</option>
              <option value="en">English</option>
            </select>
          </Field>
        </div>
      </section>

      <section className="bl-group" aria-labelledby="bl-style">
        <h3 id="bl-style">{L.template}</h3>
        <TemplateSwitch themes={themes} currentId={p.config.themeId} locked={!!p.locked} onConfirm={p.onSetTheme} lang={p.lang} />
      </section>

    </div>
  );
}

function QuestionsEditor({ questions, onChange, L }: { questions: RsvpQuestion[]; onChange: (q: RsvpQuestion[]) => void; L: ReturnType<typeof ui>["builder"] }) {
  const update = (id: string, changes: Partial<RsvpQuestion>) => onChange(questions.map((q) => (q.id === id ? { ...q, ...changes } : q)));
  return (
    <div className="bl-questions">
      {questions.map((q) => (
        <div key={q.id} className="bl-question">
          <div className="row">
            <input aria-label={L.question} value={q.label} maxLength={160} onChange={(e) => update(q.id, { label: e.target.value })} />
            <select aria-label={L.answerType} value={q.type} onChange={(e) => update(q.id, { type: e.target.value as RsvpQuestion["type"] })}>
              <option value="yes-no">{L.yesNo}</option>
              <option value="choice">{L.choice}</option>
              <option value="number">{L.numberType}</option>
              <option value="text">{L.textType}</option>
            </select>
          </div>
          <label className="check"><input type="checkbox" checked={!!q.required} onChange={(e) => update(q.id, { required: e.target.checked })} /> {L.required}</label>
          {q.type === "yes-no" && (
            <div className="row">
              <input aria-label={L.yesLabel} value={q.yes ?? "Sì"} maxLength={40} onChange={(e) => update(q.id, { yes: e.target.value })} />
              <input aria-label={L.noLabel} value={q.no ?? "No"} maxLength={40} onChange={(e) => update(q.id, { no: e.target.value })} />
            </div>
          )}
          {q.type === "choice" && (
            <input aria-label={L.options} placeholder="Sì, No, Forse" value={(q.options ?? []).join(", ")} onChange={(e) => update(q.id, { options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) })} />
          )}
          <button type="button" className="link" onClick={() => onChange(questions.filter((x) => x.id !== q.id))}>{L.removeQuestion}</button>
        </div>
      ))}
      <button type="button" className="btn outline" disabled={questions.length >= 8} onClick={() => onChange([...questions, { id: `q${Date.now().toString(36)}`, label: "Nuova domanda", type: "text" }])}>
        {L.addQuestion}
      </button>
    </div>
  );
}
