# Motore di InviteMe

Un invito è una **lista ordinata di blocchi**. Ogni blocco ha un tipo, delle proprietà e può essere nascosto. Uno **stile** (colori, font, CSS, asset) decide l'aspetto; i blocchi decidono cosa c'è nella pagina. Il renderer compone la pagina ogni volta, dalla configurazione salvata.

## Flusso

```
config (jsonb)  →  sanitizeConfig                 dati dell'evento, blocchi, domande: nessun campo fidato
                →  pageGlobals                    dati comuni: evento, date, funzioni, domande, tema
                →  per ogni blocco visibile:
                     renderTemplate(engine/blocks/<tipo>.html, {globali, proprietà del blocco})
                →  pagina HTML                    CSS dello stile + blocchi + runtime.js
```

## Dove sta il codice

| File | Ruolo |
|---|---|
| `shared/src/blocks.ts` | Registro dei 14 tipi di blocco: nome, proprietà, funzione richiesta, valori di partenza |
| `shared/src/invitation.ts` | Configurazione dell'invito, `sanitizeConfig`, `sanitizeBlocks`, `defaultConfig` |
| `shared/src/engine/template.ts` | Motore di template: segnaposto, sezioni, filtri `lines` e `url` |
| `shared/src/engine/manifest.ts` | Manifest dello stile, domande di conferma |
| `shared/src/engine/values.ts` | Validazione dei valori (testi, date, URL dei media) |
| `api/src/engine/blocks.ts` | Carica i template dei blocchi da `engine/blocks/` |
| `api/src/engine/page.ts` | Compone la pagina: blocchi, CSS, runtime, asset |
| `api/src/engine/themes.ts` | Carica e valida gli stili da `themes/`, costruisce la demo |
| `engine/runtime.js` | Comportamenti nel browser: busta, audio, gratta, countdown, video, popup RSVP |
| `engine/blocks/*.html` | Un template per tipo di blocco |
| `themes/<id>/` | Uno stile: `theme.json`, `theme.css`, `assets/` |

## Configurazione di un invito

```ts
type InviteConfig = {
  themeId: string;          // stile (cartella in themes/)
  model: string;            // modello del catalogo (prezzo)
  addons: AddonKey[];       // funzioni acquistate
  eventType: EventType;
  locale: "it" | "en";
  event: Record<string, unknown>;   // title, hosts, eventDate, eventTime, venue, address
  blocks: BlockInstance[];          // { id, type, hidden, props }
  rsvpQuestions: RsvpQuestion[];
};
```

Limiti: al massimo 30 blocchi; i blocchi unici (busta, intestazione, data, conto alla rovescia, luogo, mappa, conferma, firma) compaiono al più una volta; un blocco legato a una funzione (`countdown`, `gallery`, `program`, `map`, `rsvp`) è accettato solo se l'invito la ha.

## Dati disponibili nei template

**Dati dell'evento** (per tutti i blocchi): `title`, `hosts`, `eventDate`, `eventTime`, `venue`, `address`.

**Data**: `date.day`, `date.month`, `date.year`, `date.weekday`, `date.long` ("14 febbraio 2027"), `date.iso`.

**Altri**: `monogram` (iniziali del titolo, "S·L"), `slug`, `locale`, `preview` (true in anteprima e demo), `rsvp` (true se c'è il modulo), `rsvpQuestions`, `features.<funzione>` (booleano), `theme.id`, `theme.name`.

**Proprietà del blocco**: quelle del registro in `shared/src/blocks.ts` (per esempio `heading`, `body`, `photos`, `items`).

## Sicurezza

- Ogni valore passa da `escapeHtml`. Il filtro `lines` mantiene gli a capo come `<br>`; `url` codifica per un URL.
- I dati del cliente non possono chiudere lo script della pagina: il JSON incorporato usa `<`.
- I file (foto, video, audio) sono solo URL `/api/media/<uuid>.(jpg|mp4|mp3)` prodotti dalla conversione ffmpeg.
- Gli stili non possono contenere `@import`, `expression(`, `<script>`, `<style>`; le risorse esterne ammesse sono solo Google Fonts e Google Maps.

## Media

Foto, video e audio caricati dal cliente passano da ffmpeg (`api/src/media.ts`): video H.264 senza audio, massimo 90 secondi e 15 MB; foto JPEG con lato lungo 1800 px; audio MP3 128 kbps. Le conversioni sono in coda, una alla volta, con priorità bassa.

## Anteprima e demo

- **Anteprima del builder**: `POST /api/invitations/:id/preview` con la configurazione in corso. Mostra la busta come la vede l'ospite.
- **Demo degli stili**: `GET /api/themes/:id/demo`, con tutti i blocchi e gli esempi dello stile. Nessuna busta (`preview: true`), così le schede dei modelli si vedono subito.

## Verifica

```bash
npm run test -w @inviteme/shared
npm run test -w @inviteme/api
npm run validate-theme -w @inviteme/api          # tutti gli stili in themes/
npm run validate-theme -w @inviteme/api -- themes/<id>   # uno stile solo
```

La validazione di uno stile controlla: manifest, CSS (niente `@import`, solo `url()` verso `assets/`), host esterni ammessi, file citati presenti, e una prova di rendering della demo con tutti i blocchi, che non deve lasciare segnaposti né dati mancanti.

## Hosting

Il container `api` contiene `engine/`, `themes/` e ffmpeg. Gli stili si caricano all'avvio: un nuovo stile richiede un rilascio (rebuild e riavvio dell'API). I media stanno nel volume `media`.
