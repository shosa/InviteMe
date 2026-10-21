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

## Fase 2 (fatta)
- Nel builder, con il mouse sopra un blocco compaiono due maniglie: «Sposta» (in alto) e il bordo destro per la larghezza.
- Il trascinamento aggiorna l'anteprima in tempo reale; al rilascio la posizione entra nella cronologia (Annulla la toglie).
- Verificato nel browser: restringere il blocco, ricaricare l'editor e spostarlo di lato salva `x` e `w`; lo spostamento verticale salva `dy`.
- Cover e blocco principale restano fuori. Limite noto: su un blocco a larghezza piena lo spostamento laterale non ha effetto (va prima ristretto).
- Dopo ogni rilascio l'anteprima si ricarica: sul telefono lo scorrimento torna in alto se non è stato salvato in precedenza. Da migliorare.

## Revocato
- Lo spostamento libero dei blocchi (maniglie «Sposta» e bordo di larghezza, campi `layout` con `x`, `w`, `dy`) è stato tolto su richiesta: i blocchi tornano in colonna, come prima. Le posizioni già salvate vengono ignorate e scartate al prossimo salvataggio.
- L'affiancamento dei blocchi non è previsto; se servirà, sarà una scelta nuova (fasce orizzontali o posizione libera).
