"use client";

import { useState, type PointerEvent } from "react";
import { blockDef, isFixedPosition, type AddonKey, type BlockInstance, type BlockType, type Catalog, type InviteConfig } from "@inviteme/shared";
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, GripVertical, Plus, Trash2 } from "lucide-react";
import { ui, type Lang } from "@/lib/ui";
import { blockCopy } from "@/lib/catalogCopy";
import { BlockIcon } from "@/lib/blockIcons";
import { AddBlockDialog } from "./AddBlockDialog";

type Props = {
  blocks: BlockInstance[];
  config: InviteConfig;
  catalog: Catalog;
  selected: string | null;
  hover: string | null;
  features: ReadonlySet<AddonKey>;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onAdd: (type: BlockType, feature?: AddonKey) => void;
  onToggleAddon: (key: AddonKey) => void;
  onSetModel: (id: string) => void;
  onMove: (from: number, to: number) => void;
  onDuplicate: (id: string) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  lang?: Lang;
};

// Trascinamento dal vivo: la riga presa segue il cursore e le altre si spostano per farle posto.
type Box = { top: number; height: number };
type Drag = {
  from: number; // riga presa
  to: number; // posizione in cui cade
  startY: number;
  dy: number; // quanto il cursore si è spostato
  boxes: Box[]; // posizioni delle righe all'inizio del trascinamento
  settling: boolean; // la riga va nel suo posto prima del salvataggio
};

// Quanto si sposta la riga j per fare posto alla riga trascinata.
function shiftOf(j: number, d: Drag): number {
  if (j === d.from) return 0;
  if (d.from < j && j <= d.to) return d.boxes[j - 1].top - d.boxes[j].top;
  if (d.to <= j && j < d.from) return d.boxes[j + 1].top - d.boxes[j].top;
  return 0;
}

// Cosa manca perché il blocco mostri qualcosa: la mappa senza indirizzo non si vede, la galleria senza foto è vuota.
function missing(b: BlockInstance, config: InviteConfig, L: ReturnType<typeof ui>["builder"]): string | null {
  const p = b.props;
  switch (b.type) {
    case "map":
      return config.event.address ? null : L.hintAddress;
    case "venue":
      return p.venue || config.event.venue ? null : L.hintVenue;
    case "gallery":
      return Array.isArray(p.photos) && p.photos.length > 0 ? null : L.hintPhotos;
    case "program":
      return Array.isArray(p.items) && p.items.length > 0 ? null : L.hintItems;
    case "music":
      return p.music ? null : L.hintTrack;
    default:
      return null;
  }
}

// Colonna sinistra: la struttura dell'invito è la parte principale. I blocchi nuovi si scelgono dalla finestra del «+».
export function Canvas(p: Props) {
  const L = ui(p.lang ?? "it").builder;
  const [drag, setDrag] = useState<Drag | null>(null);
  const [adding, setAdding] = useState(false);

  // Si trascina dalla maniglia, e solo i blocchi che possono cambiare posizione.
  function canDrag(b: BlockInstance): boolean {
    const def = blockDef(b.type);
    return !def?.locked && !def?.anchored && !isFixedPosition(b.type);
  }
  function onGripDown(e: PointerEvent<HTMLSpanElement>, i: number) {
    if (e.button !== 0 || !canDrag(p.blocks[i])) return;
    const list = e.currentTarget.closest(".bl-list");
    if (!list) return;
    const boxes = Array.from(list.children).map((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, height: r.height };
    });
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
    setDrag({ from: i, to: i, startY: e.clientY, dy: 0, boxes, settling: false });
  }
  function onGripMove(e: PointerEvent<HTMLSpanElement>) {
    setDrag((d) => {
      if (!d || d.settling) return d;
      const dy = e.clientY - d.startY;
      // La riga cade dove sta il suo centro: conta quante altre righe hanno il centro sopra quello.
      const center = d.boxes[d.from].top + d.boxes[d.from].height / 2 + dy;
      let to = 0;
      d.boxes.forEach((b, j) => {
        if (j !== d.from && b.top + b.height / 2 < center) to++;
      });
      return { ...d, dy, to };
    });
  }
  // Al rilascio la riga scivola nel suo posto, poi il riordino viene salvato nella storia del builder.
  function onGripUp() {
    if (!drag || drag.settling) return;
    const d = drag;
    const slot = d.boxes[d.to].top - d.boxes[d.from].top;
    setDrag({ ...d, dy: slot, settling: true });
    window.setTimeout(() => {
      if (d.to !== d.from) p.onMove(d.from, d.to);
      setDrag(null);
    }, 170);
  }

  return (
    <div className="bl-column">
      <section className={`bl-section bl-structure${drag ? " is-sorting" : ""}`} aria-labelledby="bl-struct">
        <header className="bl-struct-head">
          <h2 id="bl-struct" className="bl-h">{L.structure}</h2>
          <button type="button" className="bl-plus" aria-label={L.addBlock} title={L.addBlock} onClick={() => setAdding(true)}>
            <Plus size={18} aria-hidden="true" />
          </button>
        </header>
        {p.blocks.length === 0 && <p className="hint">{L.noBlocks}</p>}
        <ol className="bl-list" aria-label={L.listAria}>
          {p.blocks.map((b, i) => {
            const def = blockDef(b.type);
            const name = def ? blockCopy(def.type, def.label, p.lang ?? "it") : b.type;
            const active = p.selected === b.id;
            const hint = missing(b, p.config, L);
            const lifted = drag?.from === i;
            const style = drag ? { transform: `translateY(${lifted ? drag.dy : shiftOf(i, drag)}px)` } : undefined;
            return (
              <li
                key={b.id}
                style={style}
                onMouseEnter={() => p.onHover(b.id)}
                onMouseLeave={() => p.onHover(null)}
                className={`bl-item${def?.locked ? " is-locked" : ""}${def?.anchored ? " is-anchored" : ""}${active ? " is-on" : ""}${p.hover === b.id ? " is-hover" : ""}${b.hidden ? " is-hidden" : ""}${lifted ? " is-lifted" : ""}${drag && !lifted ? " is-moving" : ""}${lifted && drag?.settling ? " is-settling" : ""}`}
              >
                <span
                  className="bl-grip"
                  aria-hidden="true"
                  onPointerDown={(e) => onGripDown(e, i)}
                  onPointerMove={onGripMove}
                  onPointerUp={onGripUp}
                  onPointerCancel={onGripUp}
                >
                  <GripVertical size={16} />
                </span>
                <button type="button" className="bl-select" onClick={() => p.onSelect(b.id)} aria-pressed={active}>
                  <span className="bl-name bl-name-row">{def && <BlockIcon type={def.type} size={16} />}<span>{name}</span></span>
                  {def?.locked && <small className="bl-lock">{L.mainBlock}</small>}
                  {def?.anchored && <small className="bl-anchor">{L.alwaysFirst}</small>}
                  {b.hidden && <small>{L.hidden}</small>}
                  {!b.hidden && hint && <small className="bl-warn">{hint}</small>}
                </button>
                <div className="bl-tools" role="group" aria-label={`${L.actionsFor} ${name}`}>
                  <button type="button" aria-label={L.moveUp} disabled={i === 0 || isFixedPosition(b.type)} onClick={() => p.onMove(i, i - 1)}><ArrowUp size={15} /></button>
                  <button type="button" aria-label={L.moveDown} disabled={i === p.blocks.length - 1 || isFixedPosition(b.type)} onClick={() => p.onMove(i, i + 1)}><ArrowDown size={15} /></button>
                  <button type="button" aria-label={b.hidden ? L.show : L.hide} onClick={() => p.onToggle(b.id)}>{b.hidden ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                  <button type="button" aria-label={L.duplicate} disabled={!!def?.unique} onClick={() => p.onDuplicate(b.id)}><Copy size={15} /></button>
                  <button type="button" aria-label={L.remove} disabled={!!def?.locked} onClick={() => p.onRemove(b.id)}><Trash2 size={15} /></button>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {adding && (
        <AddBlockDialog
          catalog={p.catalog}
          config={p.config}
          features={p.features}
          present={new Set(p.blocks.map((b) => b.type))}
          lang={p.lang}
          onClose={() => setAdding(false)}
          onAdd={(type, feature) => { p.onAdd(type, feature); setAdding(false); }}
          onToggleAddon={p.onToggleAddon}
          onSetModel={p.onSetModel}
        />
      )}
    </div>
  );
}
