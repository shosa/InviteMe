# Editor a canvas (branch `canvas-editor`)

Obiettivo: ogni cliente può spostare e ridimensionare i blocchi dell'invito nel builder.

## Decisioni
- La pagina resta a scorrimento verticale: il telefono non cambia impaginazione.
- La posizione è per blocco, non per singolo elemento: `layout: { x, w, dy }`.
  - `x` e `w` sono percentuali della larghezza della pagina (x 0–100-w, w 20–100).
  - `dy` è uno spostamento verticale in pixel (-200 / +400), che non cambia l'ordine dei blocchi.
- Nessuna posizione = comportamento attuale. I blocchi esistenti non cambiano.
- Il cover (busta) e il blocco principale restano fuori dal canvas.

## Stato
- Fatto: tipo `BlockLayout`, validazione (`sanitizeLayout`), resa nel motore (`bk-place`), test.
- Da fare (fase 2, previa approvazione): manipolazione nel builder (trascina, maniglia di larghezza), salvataggio della posizione, anteprima aggiornata a ogni movimento.
- Da decidere: posizione dentro i singoli elementi (testi, foto) oppure solo per blocco.
