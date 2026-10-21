# Stato del lavoro — InviteMe

Aggiornato a ogni checkpoint. Leggerlo prima di toccare il codice.

## Fatto e verificato

- **Modello a blocchi** (`shared/src/blocks.ts`): 14 tipi di blocco con proprietà, funzioni richieste e valori di partenza.
- **Configurazione dell'invito** (`shared/src/invitation.ts`): dati dell'evento, lista di blocchi, domande di conferma. Validazione: tipi noti, funzioni acquistate, blocchi unici, massimo 30.
- **Manifest degli stili** (`shared/src/engine/manifest.ts`): nome, colore, font, esempi per blocco; validazione di URL e percorsi.
- **Template dei blocchi** (`engine/blocks/*.html`): un file per tipo, con il markup del riferimento.
- **Renderer** (`api/src/engine/page.ts`, `api/src/engine/themes.ts`): compone la pagina dai blocchi visibili, applica lo stile, valida gli stili con una demo di prova.
- **Stile di riferimento** `themes/invitereference`: CSS, asset originali, esempi per blocco. Validatore OK.
- **Test**: `shared` 18/18, `api` 10/10, typecheck di shared e API OK.
- **Documentazione per agenti**: `docs/MOTORE.md` e `docs/TEMI.md`.

## Aggiornamenti dell'ultimo ciclo

- **Renderer a blocchi** verificato: 19/19 controlli di smoke test contro un Postgres reale (ephemeral), test API e shared verdi, validatore OK su 4 stili.
- **Builder nuovo** (web): palette dei blocchi, lista trascinabile con tastiera, pannello proprietà, annulla/ripristina con Ctrl+Z, anteprima desktop e telefono, interruttore «Mostra la busta». Verificato nel browser: nessun errore JavaScript, riordino corretto, footer sul telefono a tutta larghezza.
- **Dashboard cliente** (`/account`): panoramica (inviti, visite, risposte, ospiti) e cartelle per ogni invito con azioni rapide. Compila; non ancora verificata con dati reali nel browser.
- **Modalità demo**: `DEMO_MODE=true` attiva l'acquisto di prova solo senza Shopify. Con Shopify configurato la demo è sempre spenta.
- **Stili**: `invitereference`, `notte`, `salvia`, `carta`. Notte ha le sovrascritture per il fondo scuro. Gli ultimi tre condividono gli asset di invitereference tramite link: vedi `docs/PROMPT-ILLUSTRAZIONI.md`.
- **Documentazione**: `docs/MOTORE.md`, `docs/TEMI.md` (per agenti), `docs/PROMPT-ILLUSTRAZIONI.md`.
- **Blocco musica** (funzione `music`): aggiunto, con template e pulsante di controllo.
- **Test finali**: `shared` 18/18, `api` 10/10, validatore su 4 stili, typecheck di API e web, build di produzione del web.

## Da fare, in ordine

3. **Blocco musica** (funzione `music`): oggi non esiste come blocco; va aggiunto come tipo con proprietà audio.
4. **Dashboard del cliente**: inviti, ospiti, risposte, statistiche, pagamenti.
5. **Demo Shopify** (`DEMO_MODE`): acquisto che va a buon fine solo se la variabile è attiva e Shopify non è configurato.
6. **Layout originali** e relativi prompt per generare le illustrazioni in ChatGPT.
7. **Admin**: attivazione degli stili, catalogo, ordini, utenti.
8. **Pulizia**: cartella `themes/invitereference/assets` senza file inutilizzati; scratchpad e `/tmp/claude-0` della sessione a fine lavoro.

## Decisioni prese

- Il prodotto non riparte dai modelli e temi precedenti: un invito è una lista di blocchi, lo stile è solo aspetto.
- Il riferimento di design è la struttura delle funzioni di DigitalYes e webgencyinvitations; design, testi, immagini e marchi sono originali.
- Stili vecchi (`carta`) rimossi: non compatibili con il nuovo modello.
- Dati di prova svuotati; nessun invito reale da conservare.

## Verifiche del giro

- Domande predefinite della conferma in inglese per gli inviti con lingua inglese (`DEFAULT_RSVP_EN`, `defaultRsvp(locale)`). Test shared 18/18, api 12/12, typecheck api e web.

- Prestazioni home mobile (live): prima 691 richieste e 55 MB con 60 iframe caricati subito; ora 129 richieste e 325 KB all'apertura. Le anteprime si caricano per la scelta, le vicine e quelle che entrano nel carosello.
- Anteprime del carosello: il grigio è lo stato di caricamento. Dopo qualche secondo la pagina demo si dipinge (verificato con screenshot sul carosello; risposta del server ~25 ms). Resta da confermare su un telefono reale.

- Suite: shared 18/18, api 12/12, smoke 21/21 su stack locale con Postgres di prova.
- Builder nel browser con account di prova: nessun errore JS in IT e EN; etichette di blocchi, campi evento e nomi dei template tradotte in inglese.
- Da fare: i testi d'esempio dell'invito restano nella lingua con cui è stato creato (sono contenuto dell'utente).

## Ultimo rilascio (ultimo giro)

- Rilascio sui container live del giro corrente: API, web e database risposti 200, demo e versione inglese verificate.

## Ultimo rilascio

- Container `inviteme-web-1` e `inviteme-api-1` aggiornati dalla cartella del progetto; database invariato (vuoto), colonna `planner` aggiunta.
- Verificati dopo il rilascio: salute API, pagine demo di quattro stili (Arco, Rivista, Minimo, Giardino), `demo.shosa.me` 200.
- Test: smoke 21/21, shared 18/18, api 10/10, validatore su 4 stili, typecheck API e web.

## Pannello di gestione (planner)

- `/planner/<id>`: indicatori (invitati, risposte, presenti, persone), conto alla rovescia con nota dell'organizzatore, note organizzative, tabella delle risposte con esportazione CSV, lista ospiti.
- Accessibile dal proprio spazio per gli inviti pagati.

## Template (ultimo ciclo)

- **Venti template** in `themes/`, ciascuno con evento, testi, foto, palette e font propri. Eventi: matrimoni (Arco, Velo, Rivista, Giardino, Lavanda, lago, città), battesimi (battesimo celeste, prima comunione), anniversari (oro, argento), compleanni (festa), cene e gala aziendali, lauree, pensionamento, baby shower, festa in spiaggia, cena d'autunno.
- Composizioni: sei famiglie strutturali (Arco, Rivista, Minimo, Giardino, Velo, Notturno) con palette e font diversi per ogni template. Le composizioni nuove vanno ancora aggiunte.
- Foto da Pixabay, senza persone riconoscibili; crediti in `docs/CREDITI-IMMAGINI.md`.

## Non ancora fatto

- **Rilascio sui container live**: il sito di produzione gira ancora la versione precedente. Va rilasciato solo con il tuo ok.
- **Admin**: la console è quella precedente, da adattare ai nuovi stili e blocchi.
- **Pagamento reale Shopify**: serve la configurazione con le chiavi del tuo store.
- **Localizzazione inglese** (parziale): le etichette di sistema dei blocchi (busta, data, conto alla rovescia, conferma, firma) sono in `api/src/engine/i18n.ts` e seguono la lingua dell'invito. Test dedicato in `api/test/engine.test.ts`.
- Fatto anche: testi di partenza dei blocchi, messaggi del modulo RSVP, etichette nei template degli stili.
- **Sito (parziale)**: selettore IT/EN nella barra (cookie `lang`), navigazione, primo schermo e piè di pagina della home, `lang` del documento. Verificato con curl su entrambe le lingue.
- Dashboard cliente tradotta e verificata nelle due lingue con i servizi veri.
- Pannello di gestione tradotto (IT/EN).
- Builder tradotto interamente (barra, palette, proprietà, domande, pannello ospiti): IT/EN dal dizionario `lib/ui.ts`, verificato con typecheck e build; da verificare nel browser con un account.
- Accesso, reset, checkout di prova, home (sezioni, FAQ, modelli con testi inglesi in `lib/catalogCopy.ts`) tradotti IT/EN e verificati sul server live con cookie lang.
- Console admin: scheda «Template» (prima «Temi») con anteprima per ciascun template e attivazione. La console resta in italiano, ad uso interno.
- Pagine legali bilingui: IT e EN sono bozze marcate DRAFT, da far rivedere a un professionista.
- Composizioni nuove (testata e sezione data proprie, verificate sul server live con screenshot mobile): «Cornice» (lavanda-nozze), «Cartolina» (prima-comunione), «Menu» (argento-anniversario). Aggiunte quattro: «Finestra» (matrimonio-lago), «Pagina» (matrimonio-citta), «Medaglione» (battesimo-celeste), «Fiocchi» (baby-shower), tutte verificate sul server live. Aggiunte anche «Sipario» (notturno) e «Diploma» (laurea-giulia), verificate sul server live. Aggiunte anche «Confetti» (compleanno-festa), «Lettera» (gala-aziendale), «Diario» (pensionamento), «Onda» (festa-spiaggia), verificate sul server live. Aggiunte anche «Medaglia» (anniversario-oro), «Serra» (giardino), «Velo» (velo), «Tovaglia» (autunno-cena), «Riga» (minimo), «Copertina» (rivista), verificate sul server live. invitereference resta sulla composizione «Arco» originale. Da rifinire: la data di «Velo» su telefono reale.
- Da fare, senza domande: admin adeguata a template e blocchi, testi legali come bozza marcata DRAFT, composizioni nuove.
- Riservato a Stefano: Shopify (pagamento reale) e email vere (Resend).
- **Composizioni**: solo sei famiglie strutturali; le altre varianti cambiano palette, font, testi e foto.
- **Prestazioni**: la scheda modelli e il builder caricano venti anteprime complete: va verificata la velocità su telefono.
- **Dashboard**: panoramica e schede verificate in layout, ma non con dati reali di ospiti e risposte.

## Aperto, serve una tua decisione

- **Shopify e Resend**: le chiavi vanno in `.env` in produzione. Finché mancano, valgono solo la demo e l'invio email disattivato.
- **Materiale personale negli asset**: `invitereference` usa foto e audio della coppia di InviteReference. Va sostituito prima di vendere lo stile a clienti reali.
- **Rilascio sui container live**: non fatto. Richiede il tuo ok esplicito.

## Ultime modifiche (builder, motore, stili)

- **Sfondi animati**: confetti, bolle, petali, scintille, onde, neve. Il cliente li sceglie nel pannello generale (con colore facoltativo); lo stile può proporne uno nel `theme.json` (chiave `background`). Canvas dietro i contenuti, fermo fuori schermo e con «riduci movimento». Adattati cinque stili: compleanno-festa, festa-spiaggia, lavanda-nozze, battesimo-celeste, notturno. Verificati nel browser: tutti e sei i tipi si muovono senza errori.
- **Font per campo** con il pulsante «Aa» dentro il campo; libreria di 15 font Google (OFL).
- **Pixabay**: ricerca con i filtri dell'API (tipo, orientamento, colore incluso «sfondo trasparente», categoria, ordine, dimensione minima, scelta della redazione). Chiave dall'ambiente (`PIXABAY_API_KEY`).
- **Dress code**: lista di colori con pallino e nome visibile, nel template di default.
- **Selettori di colore** a pallino, senza padding.
- **Layout libero tolto**: i blocchi tornano in colonna.
- **Documentazione per la generazione di stili**: `docs/MOTORE.md` (motore, registro dei blocchi, sfondi, font) e `docs/TEMI.md` (contratto per chi scrive uno stile, classi, validazione, richiesta modello).
- Da verificare: deploy (non fatto, serve il tuo ok), sfondi animati su telefono reale, ricerca Pixabay con la chiave nel container.
