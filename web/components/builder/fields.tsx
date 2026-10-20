"use client";

import { AddressField } from "./AddressField";

import { useState, type ChangeEvent, type ReactNode } from "react";
import { emptyValue, type Catalog, type FieldDef } from "@inviteme/shared";
import { Upload } from "lucide-react";
import { Accordion } from "../ui/Accordion";

export type Values = Record<string, unknown>;
export type MediaKind = "photo" | "video" | "audio";

// Un campo del tema: il tipo decide l'editor. Le liste ripetono gli editor dei campi della singola voce.
export function FieldEditor({
  field,
  value,
  disabledByFeature,
  busy,
  library,
  onChange,
  onUpload,
  copy,
  standard,
}: {
  field: FieldDef;
  value: unknown;
  disabledByFeature: boolean;
  busy: string | null;
  library: Catalog["music"];
  onChange: (v: unknown) => void;
  onUpload: (kind: "photo" | "video" | "audio", file: File) => Promise<string | null>;
  copy?: (key: string, label: string) => string;
  standard?: string; // etichetta della scelta «predefinito» per colori e opzioni
}) {
  const fieldLabel = copy ? copy(field.key, field.label) : field.label;
  if (field.key === "address") return <AddressField label={fieldLabel} value={typeof value === "string" ? value : ""} onChange={(v) => onChange(v)} />;
  const label = field.required ? `${fieldLabel} *` : fieldLabel;
  if (disabledByFeature) {
    return <p className="hint">{label}: disponibile con la funzione «{field.feature}». Attivala nella scheda Funzioni.</p>;
  }
  const max = field.max;
  const text = typeof value === "string" ? value : "";

  switch (field.type) {
    case "text":
      return <Field label={label} wide><input value={text} maxLength={max ?? 200} onChange={(e) => onChange(e.target.value)} /></Field>;
    case "longtext":
      return <Field label={label} wide><textarea rows={4} maxLength={max ?? 1500} value={text} onChange={(e) => onChange(e.target.value)} /></Field>;
    case "color":
      return (
        <Field label={label}>
          <div className="color-row">
            <input type="color" aria-label={label} value={text || "#ffffff"} onChange={(e) => onChange(e.target.value)} />
            <button type="button" className="link" disabled={!text} onClick={() => onChange("")}>{standard ?? "Default"}</button>
          </div>
        </Field>
      );
    case "choice":
      return (
        <Field label={label}>
          <select value={text} onChange={(e) => onChange(e.target.value)}>
            <option value="">{standard ?? "Default"}</option>
            {(field.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
      );
    case "date":
      return <Field label={label}><input type="date" value={text} onChange={(e) => onChange(e.target.value)} /></Field>;
    case "time":
      return <Field label={label}><input type="time" value={text} onChange={(e) => onChange(e.target.value)} /></Field>;
    case "number":
      return <Field label={label}><input type="number" min={0} max={max ?? 1000} value={typeof value === "number" ? value : 0} onChange={(e) => onChange(Number(e.target.value))} /></Field>;
    case "url":
      return <Field label={label} wide><input type="url" value={text} onChange={(e) => onChange(e.target.value.trim())} /></Field>;
    case "photo":
      return <MediaSlot label={label} help={field.help} kind="photo" url={text} busy={busy} onUpload={onUpload} onChange={onChange} />;
    case "video":
      return <MediaSlot label={label} help={field.help} kind="video" url={text} busy={busy} onUpload={onUpload} onChange={onChange} />;
    case "audio":
      return (
        <div className="stack">
          <MediaSlot label={label} help={field.help} kind="audio" url={text} busy={busy} onUpload={onUpload} onChange={onChange} />
          {library.length > 0 && (
            <div className="tracks" role="radiogroup" aria-label="Brano dalla libreria">
              {library.map((t) => (
                <label key={t.id} className={`track${text === t.url ? " is-on" : ""}`}>
                  <input type="radio" name={`lib-${field.key}`} checked={text === t.url} onChange={() => onChange(t.url)} />
                  <span><b>{t.title}</b><small>{t.artist || "Libreria InviteMe"}</small></span>
                </label>
              ))}
            </div>
          )}
        </div>
      );
    case "photos": {
      const list = Array.isArray(value) ? (value as string[]) : [];
      const room = (max ?? 6) - list.length;
      return (
        <div className="stack">
          <p className="hint">{label} · fino a {max ?? 6}</p>
          <div className="thumbs">
            {list.map((src, i) => (
              <div key={src} className="thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Foto ${i + 1}`} />
                <button type="button" aria-label={`Rimuovi foto ${i + 1}`} onClick={() => onChange(list.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
          </div>
          {room > 0 && (
            <UploadButton kind="photo" busy={busy} multiple onFiles={async (files) => {
              const urls: string[] = [];
              for (const f of files.slice(0, room)) {
                const url = await onUpload("photo", f);
                if (url) urls.push(url);
              }
              if (urls.length) onChange([...list, ...urls]);
            }} />
          )}
        </div>
      );
    }
    case "list": {
      const items = Array.isArray(value) ? (value as Values[]) : [];
      return (
        <div className="stack">
          <p className="hint">{label}{max ? ` · fino a ${max} voci` : ""}</p>
          {items.map((item, i) => (
            <Accordion key={i} title={String(item[field.item?.[0]?.key ?? ""] || `Voce ${i + 1}`)} summary="" className="card-edit-acc">
              {(field.item ?? []).map((sub) => (
                <FieldEditor
                  key={sub.key}
                  field={sub}
                  value={item[sub.key]}
                  disabledByFeature={false}
                  busy={busy}
                  library={library}
                  onChange={(v) => onChange(items.map((x, j) => (j === i ? { ...x, [sub.key]: v } : x)))}
                  onUpload={onUpload}
                  copy={copy}
                />
              ))}
              <button type="button" className="link" onClick={() => onChange(items.filter((_, j) => j !== i))}>Rimuovi voce</button>
            </Accordion>
          ))}
          <button type="button" className="btn outline" disabled={max !== undefined && items.length >= max} onClick={() => onChange([...items, Object.fromEntries((field.item ?? []).map((s) => [s.key, emptyValue(s)]))])}>
            Aggiungi voce
          </button>
        </div>
      );
    }
  }
}

function MediaSlot({ label, help, kind, url, busy, onUpload, onChange }: {
  label: string;
  help?: string;
  kind: "photo" | "video" | "audio";
  url: string;
  busy: string | null;
  onUpload: (kind: "photo" | "video" | "audio", file: File) => Promise<string | null>;
  onChange: (v: unknown) => void;
}) {
  return (
    <div className="stack">
      <span className="field-label">{label}</span>
      {help && <p className="hint">{help}</p>}
      {url && kind === "photo" && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img className="media-preview" src={url} alt="" />
      )}
      {url && kind === "video" && <video className="media-preview" src={url} muted controls playsInline />}
      {url && kind === "audio" && <audio controls preload="none" src={url} />}
      <div className="row">
        <UploadButton kind={kind} busy={busy} onFiles={async (files) => {
          const next = await onUpload(kind, files[0]);
          if (next) onChange(next);
        }} />
        {url && <button type="button" className="link" onClick={() => onChange("")}>Rimuovi</button>}
      </div>
    </div>
  );
}

function UploadButton({ kind, busy, multiple, onFiles }: { kind: "photo" | "video" | "audio"; busy: string | null; multiple?: boolean; onFiles: (files: File[]) => Promise<void> }) {
  const accept = kind === "photo" ? "image/*" : kind === "video" ? "video/*" : "audio/*";
  const working = busy === kind;
  return (
    <label className="upload">
      <input type="file" accept={accept} multiple={multiple} disabled={working} onChange={async (e: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        e.target.value = "";
        if (files.length) await onFiles(files);
      }} />
      <span className="upload-inner"><Upload size={18} aria-hidden="true" />{working ? "Converto il file…" : kind === "photo" ? "Carica foto" : kind === "video" ? "Carica video" : "Carica audio"}</span>
    </label>
  );
}

export function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={wide ? "field wide" : "field"}>
      <span>{label}</span>
      {children}
    </label>
  );
}
