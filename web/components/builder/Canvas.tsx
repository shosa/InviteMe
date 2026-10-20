"use client";

import { useState, type DragEvent } from "react";
import { blockDef, type AddonKey, type BlockInstance, type BlockType, type Catalog, type InviteConfig } from "@inviteme/shared";
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
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  function onDragStart(e: DragEvent, index: number) {
    setDragging(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  }
  function onDrop(e: DragEvent, index: number) {
    e.preventDefault();
    const from = dragging ?? Number(e.dataTransfer.getData("text/plain"));
    if (Number.isInteger(from) && from !== index) p.onMove(from, index);
    setDragging(null);
    setOver(null);
  }

  return (
    <div className="bl-column">
      <section className="bl-section bl-structure" aria-labelledby="bl-struct">
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
            return (
              <li
                key={b.id}
                draggable
                onDragStart={(e) => onDragStart(e, i)}
                onDragOver={(e) => { e.preventDefault(); setOver(i); }}
                onDragLeave={() => setOver(null)}
                onDrop={(e) => onDrop(e, i)}
                onDragEnd={() => { setDragging(null); setOver(null); }}
                onMouseEnter={() => p.onHover(b.id)}
                onMouseLeave={() => p.onHover(null)}
                className={`bl-item${def?.locked ? " is-locked" : ""}${active ? " is-on" : ""}${p.hover === b.id ? " is-hover" : ""}${b.hidden ? " is-hidden" : ""}${over === i && dragging !== null && dragging !== i ? " is-over" : ""}`}
              >
                <span className="bl-grip" aria-hidden="true"><GripVertical size={16} /></span>
                <button type="button" className="bl-select" onClick={() => p.onSelect(b.id)} aria-pressed={active}>
                  <span className="bl-name bl-name-row">{def && <BlockIcon type={def.type} size={16} />}<span>{name}</span></span>
                  {def?.locked && <small className="bl-lock">{L.mainBlock}</small>}
                  {b.hidden && <small>{L.hidden}</small>}
                  {!b.hidden && hint && <small className="bl-warn">{hint}</small>}
                </button>
                <div className="bl-tools" role="group" aria-label={`${L.actionsFor} ${name}`}>
                  <button type="button" aria-label={L.moveUp} disabled={i === 0 || !!def?.locked} onClick={() => p.onMove(i, i - 1)}><ArrowUp size={15} /></button>
                  <button type="button" aria-label={L.moveDown} disabled={i === p.blocks.length - 1 || !!def?.locked} onClick={() => p.onMove(i, i + 1)}><ArrowDown size={15} /></button>
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
