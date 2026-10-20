# Creare uno stile per InviteMe

Uno **stile** è una cartella in `themes/<id>/` con tre cose: `theme.json`, `theme.css`, `assets/`. Non contiene testi né struttura: quelli sono dei blocchi, già pronti nel motore. Lo stile decide colori, font, forme, ornamenti, animazioni e l'esempio che i clienti vedono nella demo.

Il riferimento completo è `themes/invitereference`. Prima di iniziare, leggi `docs/MOTORE.md` per i blocchi e i dati disponibili.

## Regole non negoziabili

1. **Nessun dato di persone**: niente nomi, foto, video, audio o loghi reali negli asset né nella demo. Gli esempi devono essere neutri o generati.
2. **Solo asset dello stile**: ogni file è in `assets/`, con nome semplice (lettere, numeri, `.`, `-`, `_`). Nessun URL esterno, salvo i font Google e la mappa Google.
3. **Il validatore deve passare** prima di qualsiasi rilascio, senza errori.
4. **Accessibilità WCAG 2.2 AA**: contrasto del testo ≥ 4,5:1, bersagli di almeno 44 px, focus visibile, movimento ridotto rispettato.
5. **Mobile first**: lo stile deve funzionare a 360–414 px senza scorrimento orizzontale.

## Struttura

```
themes/<id>/
  theme.json      manifest: id, nome, descrizione, colore, font, esempi per blocco
  theme.css       stile di tutti i blocchi
  assets/         ornamenti, cornici, immagini, eventuali audio o video dello stile
```

## theme.json

```json
{
  "engine": 2,
  "id": "mio-stile",
  "name": "Nome per il cliente",
  "description": "Una frase che descrive lo stile.",
  "models": [],
  "themeColor": "#f7eae7",
  "fonts": ["https://fonts.googleapis.com/css2?family=Bodoni+Moda:wght@400;500&display=swap"],
  "demo": {
    "hero": { "couplePhoto": "assets/foto-esempio.jpg" },
    "gallery": { "photos": ["assets/g1.jpg", "assets/g2.jpg", "assets/g3.jpg"] },
    "dresscode": { "dress": "Black tie" }
  }
}
```

| Chiave | Obbligatoria | Regola |
|---|---|---|
| `engine` | sì | `2` |
| `id` | sì | minuscole, numeri e trattini, 2–40 caratteri, uguale al nome della cartella |
| `name` | sì | 1–60 caratteri |
| `description` | no | fino a 200 caratteri |
| `models` | no | modelli del catalogo che lo offrono; vuoto = tutti |
| `themeColor` | sì | `#RRGGBB`, colore della barra del browser |
| `fonts` | no | solo `https://fonts.googleapis.com/css2?…` |
| `demo` | no | per ogni tipo di blocco, i valori dell'esempio (vedi sotto) |

### Esempi (`demo`)

Per ogni tipo di blocco puoi indicare i valori dell'esempio. Le chiavi devono essere proprietà reali di quel blocco (vedi la tabella dei blocchi). I file sono solo percorsi `assets/nome.file`. Se un blocco non ha esempi, la demo usa i suoi valori di partenza.

## I blocchi

| Tipo | Nome | Proprietà (valori nel manifest `demo`) | Unico | Funzione |
|---|---|---|---|---|
| `cover` | Busta | `coverVideo` (file), `coverSound` (file) | sì | — |
| `hero` | Intestazione | `occasion` (testo), `couplePhoto` (foto) | sì | — |
| `scratchdate` | Data da grattare | nessuna | sì | — |
| `countdown` | Conto alla rovescia | nessuna | sì | countdown |
| `message` | Messaggio | `heading`, `body` (testo lungo) | no | — |
| `gallery` | Galleria | `heading`, `photos` (elenco di foto) | no | gallery |
| `program` | Programma | `heading`, `items` (orario + testo) | no | program |
| `venue` | Luogo | `heading`, `photo` (foto) | sì | — |
| `map` | Mappa | nessuna | sì | map |
| `transfer` | Come arrivare | `heading`, `body` | no | — |
| `dresscode` | Dress code | `heading`, `dress` | no | — |
| `video` | Video | `heading`, `video` (file) | no | — |
| `music` | Musica | `music` (file audio) | sì | music |
| `rsvp` | Conferma di presenza | `heading`, `intro` | sì | rsvp |
| `footer` | Firma | `signature` | sì | — |

Il **contenuto** dell'invito (testi, foto, date) lo inserisce il cliente nel builder: nel tuo stile devi solo prevedere come appare.

## Il template di un blocco e le sue classi

Il markup di ogni blocco è in `engine/blocks/<tipo>.html` e usa le classi del riferimento: `sec`, `card`, `title`, `fl`, `orn`, `timeline`, `t-row`, `scratch`, `us-grid`, `popup`, `seal-btn`, `footer-in`, e così via. Il tuo `theme.css` deve dare stile a queste classi. Le classi che il runtime usa per la logica (non cambiarle nello stile):

| Attributo o classe | Cosa fa |
|---|---|
| `data-cover`, `data-cover-video`, `data-cover-tap`, `data-cover-label` | busta che si apre al tocco |
| `data-base-audio`, `data-music`, `data-music-toggle` | audio di apertura e musica |
| `data-anim="fadeinup\|fadein\|zoomin\|fadeinright"` | rivelazione allo scroll (classe `in`) |
| `data-scratch`, `data-scratch-all` | casella da grattare (classe `done`) |
| `data-countdown`, `data-cd="days\|hours\|minutes\|seconds"` | conto alla rovescia |
| `data-loop-video` | video in loop, parte quando entra nello schermo |
| `data-rsvp-open`, `data-rsvp-dialog` (classe `is-open`), `data-rsvp-close` | popup della conferma |
| `data-rsvp-form`, `data-rsvp-field`, `data-rsvp-error`, `data-rsvp-success` | modulo RSVP |
| `name="website"` | campo trappola: va nascosto, non va stilizzato per essere visibile |

Il runtime aggiunge le classi di stato: `is-locked` (body), `wei-opening`, `in`, `done`, `show`, `is-paused`, `is-open`, `has-error`, `is-on`, `flip-in`, `flip-out`, `revealed`. Il CSS le deve gestire, non ignorarle.

## theme.css

- Colori, font e spaziature come variabili in `:root`.
- Mobile first: stili base per 360–414 px, poi media query per desktop.
- Nessun `#id` per gli hook del runtime: usa gli attributi `data-*`.
- `url()` solo verso `assets/…` o `data:image/…`. Niente `@import`, niente `expression(`.
- Movimento ridotto: `@media (prefers-reduced-motion: reduce)` disattiva le animazioni decorative.
- Focus visibile su ogni elemento interattivo (`:focus-visible`).
- Il CSS vale per tutta la pagina, che appartiene solo a questo stile.

## Asset

- Ornamenti, cornici e fregi: SVG preferibili, o PNG con sfondo trasparente.
- Foto e illustrazioni dello stile (solo se non sono di persone reali): JPEG, lato lungo massimo 2000 px, meno di 400 KB ciascuna.
- Audio o video dello stile: solo con diritti chiari. Di default lo stile non include musica: la sceglie il cliente.
- Per i video: H.264 senza audio, massimo 90 secondi (come il motore, vedi `api/src/media.ts`).
- Nei template e nel CSS i percorsi sono `assets/nome.file`: il motore li porta sul percorso pubblico dello stile.

## Flusso di lavoro

1. Scegli il punto di partenza: `themes/invitereference` per uno stile ricco.
2. Copia la cartella con il nuovo `id`, poi scrivi `theme.json`.
3. Scrivi `theme.css` per le classi dei blocchi (vedi l'elenco sopra), partendo dal riferimento.
4. Sostituisci gli asset con quelli del nuovo stile, senza dati di persone.
5. Valida: `npm run validate-theme -w @inviteme/api -- themes/<id>`. Correggi finché non passa, leggendo ogni errore.
6. Controlla che i test passino: `npm run test -w @inviteme/api`.
7. Prova: crea un invito con lo stile, aggiungi i blocchi, apri l'anteprima su telefono (390 px) e su desktop.
8. Rilascia: rebuild e riavvio dell'API.

## Checklist prima del rilascio

- [ ] il validatore passa senza errori
- [ ] nessun dato di persone in asset, esempi o nomi di file
- [ ] tutte le classi dei blocchi sono stilizzate, anche la versione mobile
- [ ] la busta funziona con e senza filmato
- [ ] il popup RSVP si apre, valida i campi obbligatori e si chiude con Esc
- [ ] 390 px senza scorrimento orizzontale; contrasto AA
- [ ] movimento ridotto rispettato
- [ ] font e mappe solo dagli host ammessi

## Prompt per un agente

> Crea uno stile per InviteMe in `themes/<id>/` seguendo `docs/TEMI.md` e `docs/MOTORE.md`. Parti da `themes/invitereference`. Lo stile è [descrizione: colori, atmosfera, font]. Asset: [elenco, senza dati di persone]. Esempi per blocco: [elenco]. Copri tutte le classi dei blocchi, anche il mobile. Valida con `npm run validate-theme -w @inviteme/api -- themes/<id>` e non consegnare finché non passa. Riporta i problemi trovati e come li hai risolti.
