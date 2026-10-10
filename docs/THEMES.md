# Manuale dei temi InviteMe

Questo manuale descrive come è fatto un tema e come crearne uno nuovo, anche chiedendolo a un agente.

## Modello e tema

- Il **modello** è il tipo di invito: *Save the Date* (informazioni essenziali e un countdown) oppure *Invito* (invito completo con programma, mappa e conferma di presenza).
- Il **tema** è una variante grafica e stilistica di un modello. Il cliente sceglie il tema, non i singoli colori.

Un tema è **un unico file JSON**. Dentro c'è tutto ciò che serve: colori, tipografia, forma della cornice, layout, animazioni, CSS dell'invito, font incorporato e musica di default. Non dipende da fogli di stile esterni né da file caricati a parte.

## Formato (schema 2)

Un file tema è un oggetto JSON con questi campi. Ogni campo sconosciuto fa fallire la validazione.

| Campo | Obbligatorio | Tipo e valori ammessi |
|---|---|---|
| `schema` | sì | sempre `2` |
| `id` | sì | solo minuscole, numeri e trattini, da 2 a 40 caratteri. Univoco |
| `name` | sì | testo da 1 a 60 caratteri |
| `description` | no | testo fino a 200 caratteri |
| `models` | no | elenco di `"save-the-date"` e/o `"invitation-rsvp"`. Default: entrambi |
| `palette` | sì | `paper`, `ink`, `accent` obbligatori; `muted` e `line` facoltativi. Ogni colore è `#RRGGBB` |
| `typography` | no | `display`: `"bodoni"`, `"georgia"` oppure `"custom"` (richiede `font`). `text`: `"grotesk"` oppure `"georgia"`. Default: `bodoni` e `grotesk` |
| `shape` | no | `frame`: `"arch"`, `"rect"` oppure `"oval"`. `radius`: numero da 0 a 60. Default: `arch`, `0` |
| `layout` | no | `"centered"` oppure `"editorial"` (testo allineato a sinistra). Default: `centered` |
| `motion` | no | `cover`: `"envelope"` (busta sigillata che si apre al tocco) oppure `"none"`. `reveal`: `"fade"`, `"rise"` (sale dal basso) oppure `"none"`. Default: `envelope`, `fade` |
| `css` | no | CSS dell'invito, massimo 20.000 caratteri. Vedi la sezione dedicata |
| `font` | no | `{ "family": "Nome", "src": "data:font/woff2;base64,..." }`, massimo circa 400 KB in base64. Obbligatorio se `typography.display` è `"custom"` |
| `music` | no | `defaultTrackId`: id di un brano della libreria, oppure `null`. `file`: audio incorporato come `data:audio/mpeg;base64,...` (oppure mp4 o ogg), massimo circa 2 MB |

Esempio completo: `docs/examples/tema-esempio.json`.

## Il CSS del tema

Il CSS scritto nel campo `css` vale **solo dentro l'invito di quel tema**. Il sistema aggiunge da solo lo scope, quindi scrivi selettori semplici:

```css
.inv-names { letter-spacing: 0.04em; }
.inv-arch { box-shadow: 0 18px 40px -26px rgba(31, 43, 36, 0.45); }
```

Classi disponibili nell'invito:

- Contenitore: `.inv`, `.inv--std` (Save the Date), `.inv--full` (invito completo)
- Cornice e testi: `.inv-arch`, `.inv-monogram`, `.inv-names`, `.inv-hosts`, `.inv-message`
- Data e luogo: `.inv-date`, `.inv-day`, `.inv-month`, `.inv-details`, `.inv-sub`
- Blocchi: `.inv-block`, `.inv-program`, `.inv-timeline`, `.inv-map`, `.inv-link`
- Countdown: `.inv-countdown`, `.inv-cd-unit`, `.inv-countdown-done`
- RSVP: `.rsvp`, `.rsvp-field`, `.rsvp-choice`, `.rsvp-submit`, `.rsvp-error`

Regole di sicurezza, controllate dalla validazione:
- niente `@import`, `@font-face`, `expression(`, `behavior:`, `javascript:` o il carattere `<`;
- `url(...)` ammesso solo con `data:image/`;
- ogni `@keyframes` deve avere un nome che inizia con l'id del tema, per esempio `salvia-breathe` per l'id `salvia`;
- le graffe devono essere bilanciate.

I colori del tema sono già disponibili come variabili, così il CSS può usarle senza ripeterli: `--inv-bg`, `--inv-ink`, `--inv-accent`.

## Font incorporato

1. Prendi un file di font con licenza che ne consente l'incorporamento (woff2 preferito).
2. Convertilo in base64 e scrivilo come data URL: `data:font/woff2;base64,<dati>`.
3. Nel tema: `"font": { "family": "Nome Font", "src": "data:font/woff2;base64,..." }` e `"typography": { "display": "custom", ... }`.

Il font è registrato con un nome riservato al tema, quindi non interferisce con gli altri.

## Musica incorporata

Il campo `music.file` contiene un audio come data URL (mp3, m4a o ogg). Se il cliente sceglie un brano dalla libreria, quel brano ha la precedenza sul file del tema.

## Caricare un tema

1. Valida il file da terminale:

```bash
npm run validate-theme -w @inviteme/api -- percorso/al/tema.json
```

Se è valido vedi `OK`. Se non lo è, vedi l'elenco degli errori, un campo per riga.

2. Nella console, sezione **Temi**, scegli il file `.json`. La console esegue la stessa validazione e mostra gli errori.
3. Attiva il tema con l'interruttore. I temi preimpostati si disattivano, non si eliminano; i temi caricati si possono eliminare.

Un tema caricato con lo stesso `id` di un altro tema caricato lo sostituisce. Un `id` già usato da un tema preimpostato viene rifiutato.

## Limiti

- Dimensione del file: il CSS è limitato a 20.000 caratteri, il font a circa 400 KB, l'audio a circa 2 MB.
- Il catalogo, con i temi, viene letto dal database a ogni richiesta. Per questo i temi devono restare leggeri: evita font e audio più grandi del necessario.

## Come far generare un tema a un agente

Dai all'agente questo manuale e questa richiesta:

> Crea un tema per InviteMe seguendo `docs/THEMES.md`. Il tema deve essere un unico file JSON, schema 2, valido. Descrizione del tema: [scrivi lo stile, i colori, la mood, le animazioni]. Usa `docs/examples/tema-esempio.json` come riferimento. Non usare file esterni, URL o `@import`. Se usi un font, incorporalo come data URL. Alla fine esegui `npm run validate-theme -w @inviteme/api -- <file>` e correggi finché non passa.

Checklist per chi valida il risultato:
- il file è un solo JSON, senza riferimenti esterni;
- `schema` è `2` e `id` è univoco;
- tutti i colori sono `#RRGGBB`;
- ogni `@keyframes` inizia con l'id del tema;
- il comando di validazione restituisce `OK`.
