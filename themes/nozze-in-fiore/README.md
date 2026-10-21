# Nozze in fiore

Tema engine 2 per una partecipazione di matrimonio ricca di decorazioni. Direzione scelta: rose avorio e peonie cipria, eucalipto salvia, carta calda, cornici oro antico e ceralacca. Nessun nuovo comportamento o script: interazioni e sfondo sono quelli del motore.

## Identità dei 17 blocchi

| Blocco | Composizione |
| --- | --- |
| cover | Busta con pieghe, sigillo e cornice floreale; supporta anche il filmato del cliente. |
| hero | Frontespizio botanico, arco dorato, bouquet ai piedi e centro chiaro per i testi; foto facoltativa. |
| scratchdate | Carta ad arco, ghirlanda e tre caselle come piccoli gioielli. |
| date | Tre medaglioni su un nastro salvia. |
| countdown | Quattro targhette da tavola tra due filetti dorati. |
| message | Lettera su carta, doppio bordo sfalsato e bouquet sopra. |
| gallery | Album con stampe inclinate e spaziatura alternata. |
| image | Ritratto ad arco su passe-partout con didascalia. |
| program | Ramo verticale, gemme botaniche e cartigli orari. |
| venue | Scheda ad arco da cerimonia, filetto e foto incorniciata. |
| map | Cartolina con mappa ad arco e bouquet nell'angolo. |
| transfer | Nota con bordo doppio laterale su velo salvia. |
| dresscode | Campionario cipria con colori e nomi leggibili. |
| video | Cornice da proiezione con pulsante di riproduzione nello stato di pausa. |
| music | Piccolo medaglione fisso, disponibile quando il cliente aggiunge musica. |
| rsvp | Ceralacca tra i fiori e modulo su carta ad arco; focus, errori e stati del motore. |
| footer | Firma incastonata tra due bouquet e fondo sfumato. |

## Movimento e sfondo

- Hook esistenti `data-anim` e ritardi `--d`: dissolvenze; ingrandimento e lieve salita riservati alle immagini decorative. Nessuna suddivisione o trasformazione dei testi.
- Sfondo predefinito `petals`, colore `#C78F91`. Nessun canvas inserito dai template: lo genera il motore.
- Pannelli semitrasparenti, spazi liberi e fondo del body trasparente mantengono visibili i petali.
- `prefers-reduced-motion: reduce` elimina animazioni e transizioni e rende subito visibili gli elementi. Il runtime esistente ferma anche i petali. La regola CSS è verificata nel sorgente; la preferenza del sistema non è stata emulata nel browser di collaudo.
- Le personalizzazioni del cliente per colori e forme restano affidate al CSS del motore.

## Asset e scelte

- `assets/floral-frame.jpg`: cornice generata, 1024 × 1536, meno di 400 KB.
- `assets/floral.png`: bouquet generato con alpha, 800 × 533, riutilizzato dai blocchi senza duplicare i file.
- `assets/garden-reception.jpg`: ricevimento generato senza persone, 1536 × 1024, meno di 400 KB.
- `assets/ornament.svg` e `assets/finial.svg`: fregi neutri dal tema di riferimento.
- Prompt completi e metodo di generazione in [ASSET-PROMPTS.md](ASSET-PROMPTS.md).
- Font: Cormorant Garamond e DM Sans tramite Google Fonts.
- Cinque sostituzioni di blocco conservano markup e hook standard e condividono il nuovo bouquet: hero, gallery, program, map, footer.
- Esempi del manifest neutri, senza nomi o dati di persone. La vetrina del motore può mostrare i propri dati sintetici generati.
- Nessuna musica o clip inclusa: media scelti dal cliente. Il supporto al filmato è stato provato con il segnaposto tecnico del tema di riferimento, solo nel server di collaudo.

## Verifiche

- Validatore del tema: nessun errore.
- Suite API: 33 test superati su 33. Aggiornato soltanto l'elenco statico dei temi attesi nel test esistente.
- Browser: nessuno scorrimento orizzontale a 360, 390, 414 e 1440 px; `scrollWidth` uguale alla larghezza del viewport. I bouquet ruotati del frontespizio sono contenuti con `overflow: clip`.
- Busta senza filmato e con filmato: apertura e sblocco della pagina.
- Gratta: il pulsante accessibile scopre tutte e tre le caselle.
- RSVP: apertura, due errori sui campi obbligatori vuoti, chiusura con Esc e ripristino del focus. Nessun invio di presenze effettuato.
- Colori principali su carta: contrasto calcolato oltre 4,5:1; oro scurito anche per i fondi cipria e salvia. Comandi e campi di almeno 44 px e focus visibile.

Dal root del repository:

```sh
npm run validate-theme -w @inviteme/api -- themes/nozze-in-fiore
npm run test -w @inviteme/api
```

Il validatore risolve i percorsi dalla directory da cui si lancia il comando, anche quando npm esegue lo script nella workspace `api/`. È valido anche un percorso assoluto.

Per rendere disponibile il tema nell'API già in esecuzione occorrono il rebuild e il riavvio previsti da `docs/MOTORE.md`.
