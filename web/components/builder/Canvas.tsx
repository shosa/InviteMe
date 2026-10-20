"use client";

import { useState, type DragEvent } from "react";
import { BLOCKS, blockDef, type AddonKey, type BlockInstance, type BlockType } from "@inviteme/shared";
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, GripVertical, Plus, Trash2 } from "lucide-react";
import { ui, type Lang } from "@/lib/ui";
import { blockCopy } from "@/lib/catalogCopy";

type Props = {
  blocks: BlockInstance[];
  selected: string | null;
  features: ReadonlySet<AddonKey>;
  onSelect: (id: string) => void;
  onAdd: (type: BlockType) => void;
  onMove: (from: number, to: number) => void;
  onDuplicate: (id: string) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  lang?: Lang;
};

// Colonna sinistra: palette dei blocchi da aggiungere, e la lista trascinabile dell'invito.
export function Canvas(p: Props) {
  const L = ui(p.lang ?? "it").builder;
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const present = new Set(p.blocks.map((b) => b.type));

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
      <section className="bl-section" aria-labelledby="bl-add">
        <h2 id="bl-add" className="bl-h">{L.addBlock}</h2>
        <ul className="bl-palette">
          {BLOCKS.map((def) => {
            const locked = !!def.feature && !p.features.has(def.feature);
            const taken = !!def.unique && present.has(def.type);
            const disabled = locked || taken;
            return (
              <li key={def.type}>
                <button type="button" className="bl-add" disabled={disabled} onClick={() => p.onAdd(def.type)} title={def.description}>
                  <Plus size={14} aria-hidden="true" />
                  <span>{blockCopy(def.type, def.label, p.lang ?? "it")}</span>
                  {locked && <small>{L.withFeature}</small>}
                  {taken && !locked && <small>{L.already}</small>}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="bl-section bl-structure" aria-labelledby="bl-struct">
        <h2 id="bl-struct" className="bl-h">{L.structure}</h2>
        {p.blocks.length === 0 && <p className="hint">{L.noBlocks}</p>}
        <ol className="bl-list" aria-label={L.listAria}>
          {p.blocks.map((b, i) => {
            const def = blockDef(b.type);
            const active = p.selected === b.id;
            return (
              <li
                key={b.id}
                draggable
                onDragStart={(e) => onDragStart(e, i)}
                onDragOver={(e) => { e.preventDefault(); setOver(i); }}
                onDragLeave={() => setOver(null)}
                onDrop={(e) => onDrop(e, i)}
                onDragEnd={() => { setDragging(null); setOver(null); }}
                className={`bl-item${active ? " is-on" : ""}${b.hidden ? " is-hidden" : ""}${over === i && dragging !== null && dragging !== i ? " is-over" : ""}`}
              >
                <span className="bl-grip" aria-hidden="true"><GripVertical size={16} /></span>
                <button type="button" className="bl-select" onClick={() => p.onSelect(b.id)} aria-pressed={active}>
                  <span className="bl-name">{def ? blockCopy(def.type, def.label, p.lang ?? "it") : b.type}</span>
                  {b.hidden && <small>{L.hidden}</small>}
                </button>
                <div className="bl-tools" role="group" aria-label={`${L.actionsFor} ${def ? blockCopy(def.type, def.label, p.lang ?? "it") : b.type}`}>
                  <button type="button" aria-label={L.moveUp} disabled={i === 0} onClick={() => p.onMove(i, i - 1)}><ArrowUp size={15} /></button>
                  <button type="button" aria-label={L.moveDown} disabled={i === p.blocks.length - 1} onClick={() => p.onMove(i, i + 1)}><ArrowDown size={15} /></button>
                  <button type="button" aria-label={b.hidden ? L.show : L.hide} onClick={() => p.onToggle(b.id)}>{b.hidden ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                  <button type="button" aria-label={L.duplicate} disabled={!!def?.unique} onClick={() => p.onDuplicate(b.id)}><Copy size={15} /></button>
                  <button type="button" aria-label={L.remove} onClick={() => p.onRemove(b.id)}><Trash2 size={15} /></button>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
