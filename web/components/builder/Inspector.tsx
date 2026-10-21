"use client";

import { BLOCK_LABELS, EVENT_FIELDS, EVENT_TYPES, HERO_EVENT_KEYS, blockDef, enabledThemes, type BlockDef, type BlockInstance, type Catalog, type EventType, type FieldDef, type FontId, type InviteConfig, type RsvpQuestion } from "@inviteme/shared";
import { Fragment, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Ellipsis, Eye, EyeOff, Image as ImageIcon, LayoutGrid, Palette, Shapes, Trash2, Type } from "lucide-react";
import { Field, FieldEditor, type Values } from "./fields";
import { FontButton } from "./FontButton";
import { TemplateSwitch } from "./TemplateSwitch";
import { ui } from "@/lib/ui";
import { blockCopy, fieldCopy } from "@/lib/catalogCopy";

// Luogo e indirizzo: con il blocco Mappa si modificano lì, non nel pannello Evento.
const LOCATION_KEYS = ["address"];

// I testi del template (sopratitolo, etichette): se il campo è vuoto mostra il testo predefinito, così si può modificare.
function templateValue(p: Props, def: BlockDef, key: string): unknown {
  const raw = (p.block!.props as Values)[key];
  const isTemplateText = (def.type === "hero" && key === "kicker") || (BLOCK_LABELS[def.type] ?? []).some((l) => l.key === key);
  if (!isTemplateText || (raw !== undefined && raw !== "")) return raw ?? def.defaults[key];
  return (p.config.locale === "en" ? def.defaultsEn?.[key] : undefined) ?? def.defaults[key];
}

// Gruppi di proprietà, nell'ordine in cui compaiono nelle schede: testi, colori, forme, immagini, altro.
type TabKey = "all" | "texts" | "colors" | "shapes" | "media" | "other";
const SHAPE_KEYS = ["cellShape", "galleryStyle", "lookShape", "photoShape"];
const MEDIA_TYPES = ["photo", "photos", "video", "audio"];
const MEDIA_KEYS = ["photoFit", "photoFocus"];
function fieldTab(f: FieldDef): Exclude<TabKey, "all"> {
  if (["text", "longtext", "url", "date", "time", "number"].includes(f.type)) return "texts";
  if (f.type === "color") return "colors";
  if (f.type === "choice" && SHAPE_KEYS.includes(f.key)) return "shapes";
  if (MEDIA_TYPES.includes(f.type) || MEDIA_KEYS.includes(f.key)) return "media";
  return "other";
}
const TAB_ORDER: Exclude<TabKey, "all">[] = ["texts", "colors", "shapes", "media", "other"];
const isTextField = (f: FieldDef) => f.type === "text" || f.type === "longtext";

// Una riga del pannello: una proprietà del blocco, oppure un dato dell'evento (solo nell'Intestazione).
type Item = { field: FieldDef; event: boolean };

function BlockFields({ p, def, L }: { p: Props; def: BlockDef; L: ReturnType<typeof ui>["builder"] }) {
  const [tab, setTab] = useState<TabKey>("all");
  const items = useMemo<Item[]>(() => {
    const own = def.fields.map((field) => ({ field, event: false }));
    const fromEvent = def.type === "hero" ? EVENT_FIELDS.filter((f) => HERO_EVENT_KEYS.includes(f.key)).map((field) => ({ field, event: true })) : [];
    return [...fromEvent, ...own].sort((a, b) => TAB_ORDER.indexOf(fieldTab(a.field)) - TAB_ORDER.indexOf(fieldTab(b.field)));
  }, [def]);
  const shown = tab === "all" ? items : items.filter((i) => fieldTab(i.field) === tab);
  const present = new Set(items.map((i) => fieldTab(i.field)));
  const groupLabel: Record<Exclude<TabKey, "all">, string> = { texts: L.tabTexts, colors: L.tabColors, shapes: L.tabShapes, media: L.tabMedia, other: L.tabOther };
  // Font scelti per i singoli testi del blocco (campo → font), salvati nelle proprietà del blocco.
  const fontsOf = (p.block!.props.fonts ?? {}) as Record<string, string>;
  function setFont(key: string, id: FontId | null) {
    const next = { ...fontsOf };
    if (id) next[key] = id;
    else delete next[key];
    p.onSetProp(p.block!.id, "fonts", next, `${p.block!.id}:fonts:${key}`);
  }
  const tabs: [TabKey, string, LucideIcon][] = [
    ["all", L.tabAll, LayoutGrid],
    ["texts", L.tabTexts, Type],
    ["colors", L.tabColors, Palette],
    ["shapes", L.tabShapes, Shapes],
    ["media", L.tabMedia, ImageIcon],
    ["other", L.tabOther, Ellipsis],
  ];
  return (
    <>
      <div className="bl-tabs" role="tablist">
        {tabs.filter(([k]) => k === "all" || present.has(k)).map(([k, label, Icon]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "bl-tab on" : "bl-tab"} onClick={() => setTab(k)}>
            <Icon size={15} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      <div className="bl-fields">
        {shown.map(({ field: f, event }, i) => {
          const group = fieldTab(f);
          // Nella scheda «Tutto» ogni gruppo ha la sua intestazione, al primo campo che lo apre.
          const opens = tab === "all" && (i === 0 || fieldTab(shown[i - 1].field) !== group);
          const field = event ? (
            <FieldEditor
              key={`event:${f.key}`}
              copy={(k, l) => fieldCopy("event", k, l, p.lang ?? "it")}
              field={f}
              value={(p.config.event as Values)[f.key]}
              disabledByFeature={false}
              busy={p.busy}
              library={p.catalog.music}
              onChange={(v) => p.onSetEvent(f.key, v, `event:${f.key}`)}
              onUpload={p.onUpload}
            />
          ) : (
            <FieldEditor
              key={f.key}
              copy={(k, l) => fieldCopy(def.type, k, l, p.lang ?? "it")}
              standard={L.standardStyle}
              field={f}
              value={templateValue(p, def, f.key)}
              disabledByFeature={false}
              busy={p.busy}
              library={p.catalog.music}
              onChange={(v) => p.onSetProp(p.block!.id, f.key, v, `${p.block!.id}:${f.key}`)}
              onUpload={p.onUpload}
            />
          );
          // Ogni testo ha il suo «Aa»: il font si sceglie per quel campo solo.
          const control = isTextField(f) ? (
            <div className="bl-fieldwrap" key={`font:${event ? "event:" : ""}${f.key}`}>
              {field}
              <FontButton label={f.label} value={fontsOf[f.key]} onChange={(id) => setFont(f.key, id)} />
            </div>
          ) : field;
          if (!opens) return control;
          return (
            <Fragment key={`group:${group}:${i}`}>
              <p className="bl-group">{groupLabel[group]}</p>
              {control}
            </Fragment>
          );
        })}
      </div>
    </>
  );
}

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
          <BlockFields key={p.block.id} p={p} def={def} L={L} />
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
  const hasHero = p.config.blocks.some((b) => b.type === "hero");
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
          {EVENT_FIELDS.filter((f) => !(hasHero && HERO_EVENT_KEYS.includes(f.key)) && !(hasMap && LOCATION_KEYS.includes(f.key))).map((f) => (
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
