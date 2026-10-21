# Creare uno stile per InviteMe

Uno **stile** (tema) è una cartella in `themes/<id>/` con `theme.json`, `theme.css` e, se serve, `assets/` e `blocks/`. Non contiene testi né struttura: quelli sono dei blocchi, già pronti nel motore. Lo stile decide colori, font, forme, ornamenti, animazioni, uno sfondo animato facoltativo, e l'esempio che i clienti vedono nella demo.

Questa guida è il contratto per chi scrive uno stile, anche un agente. Il funzionamento del motore è in `docs/MOTORE.md`. Il riferimento completo è `themes/invitereference`.

## Regole non negoziabili

1. **Nessun dato di persone**: niente nomi, foto, video, audio o loghi reali negli asset, negli esempi o nei nomi dei file. Gli esempi sono neutri o generati.
2. **Solo asset dello stile**: ogni file è in `assets/`, con nome semplice (lettere, numeri, `.`, `-`, `_`). Nessun URL esterno, salvo i font Google e la mappa Google.
3. **Il validatore deve passare** prima di qualsiasi rilascio, senza errori.
4. **Accessibilità WCAG 2.2 AA**: contrasto del testo ≥ 4,5:1, bersagli di almeno 44 px, focus visibile, movimento ridotto rispettato.
5. **Mobile first**: lo stile deve funzionare a 360–414 px senza scorrimento orizzontale.
6. **Nessun codice nuovo**: uno stile è HTML di template, CSS e dati. Non aggiungere script, non cambiare il runtime, non inserire tag `<script>`, `<style>`, `<link>`, `<meta>`, `<base>`, `<html>`, `<head>`, `<body>`.

## Struttura

```
themes/<id>/
  theme.json      manifest: identità, font, colore, sfondo proposto, esempi per la demo   (obbligatorio)
  theme.css       stile di tutti i blocchi                                               (obbligatorio)
  assets/         ornamenti, cornici, immagini, eventuali audio o video dello stile      (facoltativo)
  blocks/         sostituzioni di blocco: <tipo>.html con markup proprio                 (facoltativo)
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
  "background": { "kind": "sparkles", "color": "#c9a24b" },
  "demo": {
    "hero": { "couplePhoto": "assets/foto-esempio.jpg" },
    "gallery": { "photos": ["assets/g1.jpg", "assets/g2.jpg", "assets/g3.jpg"] },
    "dresscode": { "dress": "Black tie" }
  }
}
```

Solo queste chiavi sono ammesse (qualunque altra è un errore): `engine`, `id`, `name`, `description`, `models`, `themeColor`, `fonts`, `demo`, `background`.

| Chiave | Obbligatoria | Regola |
|---|---|---|
| `engine` | sì | `2` |
| `id` | sì | minuscole, numeri e trattini, 2–40 caratteri, uguale al nome della cartella, unico tra gli stili |
| `name` | sì | 1–60 caratteri |
| `description` | no | fino a 200 caratteri (il resto viene tagliato) |
| `models` | no | elenco di modelli del catalogo che offrono lo stile; vuoto = tutti |
| `themeColor` | sì | `#RRGGBB`, colore della barra del browser |
| `fonts` | no | solo URL `https://fonts.googleapis.com/css2?…` (non altri host) |
| `background` | no | sfondo animato proposto: `{ "kind": …, "color": "#RRGGBB" }`. `kind` è uno di `confetti`, `bubbles`, `petals`, `sparkles`, `waves`, `snow`, `none`. `color` è facoltativo. Vedi «Sfondi animati» |
| `demo` | no | per ogni tipo di blocco, i valori dell'esempio (vedi sotto) |

### Esempi (`demo`)

Per ogni tipo di blocco puoi indicare i valori dell'esempio. Le chiavi devono essere proprietà reali di quel blocco (tabella sotto). I file sono solo percorsi `assets/nome.file`, e devono esistere. Non sono ammessi URL esterni, né `/`, né `\` nei percorsi. Per la chiave `event` sono ammessi solo `title`, `hosts`, `eventDate`, `eventTime`, `venue`, `address`. Se un blocco non ha esempi, la demo usa i suoi valori di partenza.

## I blocchi

Diciassette tipi. Il registro completo (con vincoli e lunghezze) è in `shared/src/blocks.ts`.

| Tipo | Nome | Proprietà dell'esempio (`demo`) | Unico | Funzione |
|---|---|---|---|---|
| `cover` | Busta | `topText`, `sealText`, `coverVideo` (file), `coverSound` (file), `tapLabel` | sì | — |
| `hero` | Intestazione | `kicker`, `occasion`, `couplePhoto` (foto), `scrollLabel` | sì | — |
| `scratchdate` | Data da grattare | `dateTitle`, `dayLabel`, `monthLabel`, `yearLabel`, `revealLabel` | sì | — |
| `date` | Data | `dateTitle`, `showLabels` | sì | — |
| `countdown` | Conto alla rovescia | — | sì | countdown |
| `message` | Messaggio | `heading`, `body` | no | — |
| `gallery` | Galleria | `heading`, `photos` (fino a 6) | no | gallery |
| `image` | Immagine | `photo` (foto), `caption` | no | — |
| `program` | Programma | `heading`, `items` (orario + testo, fino a 8) | no | program |
| `venue` | Location | `heading`, `venue`, `kind`, `photo` | sì | — |
| `map` | Mappa | — | sì | map |
| `transfer` | Come arrivare | `heading`, `body` | no | — |
| `dresscode` | Dress code | `heading`, `dress`, `colors` (fino a 6: `hex`, `name`) | no | — |
| `video` | Video | `heading`, `video` (file) | no | — |
| `music` | Musica | `music` (file audio) | sì | music |
| `rsvp` | Conferma di presenza | `heading`, `intro`, `openLabel`, `submitLabel`, `thanksLabel` | sì | rsvp |
| `footer` | Firma | `signature` | sì | — |

Il **contenuto** dell'invito (testi, foto, date) lo inserisce il cliente nel builder: nel tuo stile devi solo prevedere come appare, anche quando un campo è vuoto.

### Classi e attributi di ogni template

Il markup di ogni blocco è in `engine/blocks/<tipo>.html`. Il tuo `theme.css` deve dare stile a tutte le classi di questo elenco, anche in versione mobile.

| Blocco | Classi da stilizzare |
|---|---|
| `cover` | `env`, `env-card`, `env-flap`, `env-seal`, `env-top`, `wei-chevron` |
| `hero` | `hero`, `hero-scene`, `hero-fl`, `h-text`, `h-vista`, `names`, `l`, `r`, `welcome`, `occasion`, `scroll-cue`, `arrow`, `fl`, `sec` |
| `scratchdate` | `date-sec`, `card`, `title`, `fl-div`, `hint`, `scratch-row`, `scratch`, `sc-val`, `sc-labels`, `reveal-all`, `sec` |
| `date` | `dt-row`, `dt-cell`, `dt-num`, `dt-lab`, `dt-col`, `dt-sec`, `title`, `sec` |
| `countdown` | `countdown-sec`, `card`, `time-block`, `number`, `number-wrap`, `label`, `separator`, `sep1`, `sep2`, `sep3`, `orn`, `sec` |
| `message` | `invito-sec`, `card`, `title`, `after`, `lettera`, `sec` |
| `gallery` | `us-sec`, `us-grid`, `us-fl`, `card`, `title`, `fl`, `orn`, `sec` |
| `image` | `img-sec`, `img-block`, `sec` |
| `program` | `prog-sec`, `card`, `title`, `prog-fl`, `fl`, `timeline`, `rail`, `t-row`, `t-time`, `t-dot`, `t-name`, `t-cell`, `finial`, `l`, `r`, `sec` |
| `venue` | `loc-sec`, `card`, `title`, `loc-name`, `loc-addr`, `loc-photo`, `sec` |
| `map` | `map-sec`, `map-frame`, `map-fl`, `fl`, `sec` |
| `transfer` | `shuttle-sec`, `shuttle-box`, `card`, `title`, `body`, `sec` |
| `dresscode` | `dress-sec`, `card`, `title`, `dress`, `dress-dots` (i pallini: `span` con `role="img"` e colore in `background`), `orn`, `sec` |
| `video` | `video-sec`, `card`, `title`, `video-frame`, `video-play`, `orn`, `sec` |
| `music` | `music-toggle` |
| `rsvp` | `rsvp-sec`, `card`, `title`, `body`, `seal-btn`, `seal-text`, `seal-cue`, `arrow-up`, `rsvp-fl`, `fl`, `popup`, `popup__box`, `popup__title`, `popup__close`, `form`, `field`, `lab`, `ind`, `radio-wrap`, `radio`, `submit`, `success`, `err`, `invio-ko`, `honey`, `visually-hidden` |
| `footer` | `footer-sec`, `footer-in`, `signature`, `credits`, `title`, `fl`, `l`, `r`, `orn`, `sec` |

Classi di stato che il runtime aggiunge (il CSS le deve gestire): `is-locked` (body), `wei-opening`, `in`, `done`, `show`, `is-paused`, `is-open`, `has-error`, `is-on`, `flip-in`, `flip-out`, `revealed`.

Il contenitore `.bk` (vedi «Aspetto dei blocchi») avvolge un blocco solo se il cliente ha scelto un colore o una forma.

### Attributi che il runtime usa (non cambiarli)

| Attributo | Cosa fa |
|---|---|
| `data-cover`, `data-cover-video`, `data-cover-tap`, `data-cover-label` | busta che si apre al tocco |
| `data-base-audio`, `data-music`, `data-music-toggle` | audio di apertura e musica |
| `data-anim="fadeinup\|fadein\|zoomin\|fadeinright"` | rivelazione allo scroll (classe `in`). Con `style="--d:.2s"` si ritarda. Dove il browser lo supporta, il motore aggiunge a ogni `data-anim` uno scorrimento laterale legato alla posizione di scorrimento (da sinistra e da destra, alternati). La dissolvenza resta quella dello stile (`in`, a tempo): non serve scriverla nel tema. Gli elementi in un carosello orizzontale si rivelano scorrendolo |
| `data-scratch`, `data-scratch-all` | casella da grattare (classe `done`) |
| `data-countdown="AAAA-MM-GGTHH:mm"`, `data-cd="days\|hours\|minutes\|seconds"` | conto alla rovescia |
| `data-countdown-before`, `data-countdown-after` | elementi mostrati prima e dopo la data |
| `data-loop-video` | video in loop, parte quando entra nello schermo |
| `data-rsvp-open`, `data-rsvp-dialog` (classe `is-open`), `data-rsvp-close` | popup della conferma |
| `data-rsvp-form`, `data-rsvp-field`, `data-rsvp-error`, `data-rsvp-success` | modulo RSVP |
| `name="website"` | campo trappola: va nascosto, non va stilizzato per essere visibile |

Il runtime non è un tuo file: non lo modifichi. Se un comportamento non è in questo elenco, non esiste: non inventarlo nel template.

## theme.css

- Colori, font e spaziature come variabili in `:root`. Il tema deve dichiarare i colori del testo in modo da superare il contrasto AA.
- **Mobile first**: stili base per 360–414 px, poi `@media (min-width: …)` per desktop.
- Nessun `#id` per gli hook: usa gli attributi `data-*` e le classi.
- `url()` solo verso `assets/…` o `data:image/…`. Niente `@import`, niente `expression(`.
- **Movimento ridotto**: `@media (prefers-reduced-motion: reduce)` disattiva le animazioni decorative (le transizioni, le rotazioni, gli scorrimenti). Il runtime già rispetta questa preferenza per lo sfondo animato.
- **Focus visibile** su ogni elemento interattivo (`:focus-visible`).
- Il CSS vale per tutta la pagina, che appartiene solo a questo stile.

### Aspetto dei blocchi (proprietà del cliente)

Quando il cliente sceglie colori o forme per un blocco, il motore aggiunge:
- un contenitore `div.bk` con gli stili `--bk-bg` (sfondo), `--bk-ink` (testo), `--bk-cover` (copertura del gratta);
- `data-shape` (`square`, `round`, `pill`): forma dei campi della data da grattare;
- `data-photo-shape` (`arch`, `circle`, `oval`, `rounded`, `diamond`, `hexagon`): forma delle foto del blocco, applicata dal motore a `img` (il CSS di base già gestisce `arch` e `circle`);
- `data-gallery` (`slider`, `mosaic`, `grid`): disposizione della galleria;
- `data-cell-shape` (`box`, `round`, `pill`, `plain`): forma delle celle della data.

Il CSS di base dello stile deve convivere con queste scelte: non fissare dimensioni, `border-radius` o `aspect-ratio` delle foto e delle celle in modo che il cliente non possa cambiarle (usa gli stili del motore, o sovrascrivi solo ciò che lo stile deve imporre).

### Font

- I font di uno stile vanno in `fonts` (manifest) e si usano con `font-family` nel CSS.
- Il cliente può cambiare il font di ogni singolo testo con il pulsante «Aa». Lo stile non deve dipendere da un font fisso per leggere il testo: scegli font con un fallback chiaro (`Georgia, serif` o `system-ui, sans-serif`).
- La libreria dei font scelti dal cliente è in `shared/src/fonts.ts` (Google Fonts, licenza OFL). Non è necessario dichiararla nello stile.

## Sfondi animati

Lo sfondo animato è un livello di movimento dietro tutti i contenuti: confetti, bolle, petali, scintille, onde, neve. Il motore lo inserisce; lo stile decide solo se proporne uno e con quale colore.

| `kind` | Effetto | Quando sceglierlo |
|---|---|---|
| `confetti` | coriandoli che cadono e ruotano | feste, compleanni, ricorrenze allegre |
| `bubbles` | bolle che salgono e ondeggiano | battesimi, estate, atmosfera leggera |
| `petals` | petali che scendono dolcemente | nozze, primavera, campagna |
| `sparkles` | piccole luci che pulsano | eleganza, anniversari, sere stellate |
| `waves` | onde lente in fondo alla pagina | mare, spiaggia, estate |
| `snow` | fiocchi che scendono lenti | inverno, feste natalizie |
| `none` | spento | per uno stile sobrio che non deve muoversi |

Regole per lo stile:
- Proponi uno sfondo solo se si accorda con l'atmosfera: lo sfondo è un tratto dello stile, non un decoro qualsiasi.
- `color` (facoltativo, `#RRGGBB`): colore d'accento delle particelle. Scegli un colore che resti visibile sul fondo dello stile e non compete con il testo. Senza `color` il movimento usa una tavolozza calda neutra.
- Le sezioni e le schede del tema devono avere lo sfondo **trasparente o semitrasparente** dove vuoi che il movimento si veda. Una scheda opaca lo nasconde: è una scelta voluta per i testi, ma va bilanciata.
- Non aggiungere un proprio canvas o script per simulare il movimento: il motore lo fa già, e il runtime lo ferma quando non è visibile.
- Il movimento è decorativo: non deve mai contenere informazioni (date, nomi, indirizzi) né distrarre dal testo.

## Sostituzioni di blocco (`blocks/`)

Quando uno stile vuole un markup diverso per un blocco, mette `themes/<id>/blocks/<tipo>.html`. Il file sostituisce il template di default **solo per quel tipo**. Regole:
- il nome del file deve essere un tipo di blocco noto (vedi tabella);
- niente `<script>`, `<style>`, `<link>`, `<meta>`, `<base>`, `<html>`, `<head>`, `<body>`;
- niente gestori inline (`onclick=…`);
- stessi dati e stessi segnaposto del template di default (vedi `engine/blocks/`), e le stesse classi del runtime.

Per la maggior parte degli stili non serve: basta il CSS. Usa una sostituzione quando il layout del blocco deve cambiare davvero (per esempio la colonna di nomi, o il programma a scorrimento).

## Asset

- Ornamenti, cornici e fregi: SVG preferibili, o PNG con sfondo trasparente.
- Foto e illustrazioni dello stile (solo se non sono di persone reali): JPEG, lato lungo massimo 2000 px, meno di 400 KB ciascuna.
- Audio o video dello stile: solo con diritti chiari. Di default lo stile non include musica: la sceglie il cliente.
- Per i video: H.264 senza audio, massimo 90 secondi.
- Nei template e nel CSS i percorsi sono `assets/nome.file`: il motore li porta sul percorso pubblico dello stile.

## Validazione

```bash
npm run validate-theme -w @inviteme/api -- themes/<id>      # uno stile
npm run validate-theme -w @inviteme/api                      # tutti
npm run test -w @inviteme/api
```

Il validatore controlla, in ordine: il manifest (chiavi ammesse, tipi, `themeColor`, `fonts`, `background`, `demo`); la presenza di `theme.json` e `theme.css`; gli host citati nel CSS (ammessi: Google Fonts, Google Maps, w3.org); l'uso di `@import`, `expression(`, `<style>`, `<script>`; `url()` solo verso `assets/` o `data:image/`; le sostituzioni di blocco; i file citati e presenti; una prova di rendering della demo con tutti i blocchi, che non deve lasciare segnaposti senza dato.

## Flusso di lavoro

1. Scegli il punto di partenza: `themes/invitereference` per uno stile ricco, `themes/minimo` per uno sobrio.
2. Copia la cartella con il nuovo `id`, poi scrivi `theme.json` (incluso `background`, se lo proponi).
3. Scrivi `theme.css` per tutte le classi dei blocchi (tabella sopra), mobile first, con il movimento ridotto e il focus visibile.
4. Aggiungi le eventuali sostituzioni in `blocks/`, solo dove serve davvero.
5. Sostituisci gli asset con quelli del nuovo stile, senza dati di persone.
6. Valida: `npm run validate-theme -w @inviteme/api -- themes/<id>`. Correggi finché non passa, leggendo ogni errore.
7. Test: `npm run test -w @inviteme/api`.
8. Prova: crea un invito con lo stile, aggiungi i blocchi, apri l'anteprima su telefono (390 px) e su desktop. Verifica lo sfondo animato, se lo proponi, con movimento normale e con «riduci movimento».
9. Rilascia: rebuild e riavvio dell'API.

## Checklist prima del rilascio

- [ ] il validatore passa senza errori
- [ ] nessun dato di persone in asset, esempi o nomi di file
- [ ] tutte le classi dei blocchi sono stilizzate, anche la versione mobile
- [ ] la busta funziona con e senza filmato
- [ ] il popup RSVP si apre, valida i campi obbligatori e si chiude con Esc
- [ ] il Dress code mostra i pallini e i nomi dei colori
- [ ] 390 px senza scorrimento orizzontale; contrasto AA
- [ ] movimento ridotto rispettato (CSS e sfondo animato)
- [ ] lo sfondo animato, se presente, si vede dietro i contenuti e non copre i testi
- [ ] font e mappe solo dagli host ammessi
- [ ] nessun `<script>`, `<style>` o gestore inline nei file

## Prompt per un agente

Per uno stile semplice:

> Crea uno stile per InviteMe in `themes/<id>/` seguendo `docs/TEMI.md` e `docs/MOTORE.md`. Parti da `themes/invitereference`. Lo stile è [descrizione: colori, atmosfera, font]. Sfondo animato proposto: [tipo e colore, o nessuno]. Asset: [elenco, senza dati di persone]. Esempi per blocco: [elenco]. Copri tutte le classi dei blocchi, anche il mobile. Valida con `npm run validate-theme -w @inviteme/api -- themes/<id>` e non consegnare finché non passa. Riporta i problemi trovati e come li hai risolti.

Per uno stile complesso e animato:

> Crea uno stile per InviteMe in `themes/<id>/` seguendo `docs/TEMI.md` e `docs/MOTORE.md`, in particolare la sezione «Sfondi animati» e il contratto delle classi. Atmosfera: [descrizione]. Obiettivi: (1) tutti i blocchi con una loro identità visiva, non un'unica griglia; (2) animazioni CSS decorative di ingresso con `data-anim` e `--d` per ritardi, senza alterare il testo; (3) sfondo animato `[tipo]` con colore `[#RRGGBB]`, con i pannelli semitrasparenti dove serve; (4) layout mobile first a 390 px senza scorrimento orizzontale, e movimento ridotto rispettato. Vincoli: nessun codice nuovo, nessun `<script>`, nessun gestore inline, nessun dato di persone. Non inventare classi o attributi del runtime che non sono in `docs/TEMI.md`. Valida con `npm run validate-theme -w @inviteme/api -- themes/<id>` e correggi finché non passa; poi elenca cosa hai fatto per ogni punto e le scelte che hai dovuto prendere.
