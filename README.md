# InviteMe

Inviti digitali per matrimoni ed eventi. Il cliente crea un account, sceglie uno dei due modelli, personalizza l'invito con anteprima in tempo reale, paga una sola volta e invia il link agli ospiti. Le conferme di presenza arrivano in un pannello e per email.

## Avvio in sviluppo

```bash
npm install
npm run dev
```

Apri http://localhost:3000, crea un account e scegli un modello. In sviluppo il pagamento è una simulazione, così l'intero flusso è testabile.

## Test automatico

```bash
npm run build
ALLOW_LOCAL_CHECKOUT=true ADMIN_TOKEN=test npm start -- -p 3300   # in un altro terminale
BASE_URL=http://localhost:3300 ADMIN_TOKEN=test npm run smoke
```

Il test copre registrazione, sessioni, modifica, pagamento, pagina pubblica, invio agli ospiti, conferme, CSV, metriche e webhook Shopify (firma valida e firma errata).

## Cosa fa

- **Due modelli**: *Save the Date* (foto, nomi, data, conto alla rovescia) e *Invito con conferma presenza* (programma, mappa, musica, modulo di conferma personalizzabile).
- **Tre stili** per modello: Avorio, Laguna, Corallo. Cambiano colori e tipografia, il contenuto resta lo stesso.
- **Builder** con autosalvataggio e anteprima in tempo reale. Dopo il pagamento l'invito è bloccato, così il link condiviso non cambia.
- **Account**: registrazione, accesso, recupero password via email, elenco dei propri inviti.
- **Ospiti**: invio del link via email, conferme in tempo reale, esigenze alimentari, export CSV.
- **Email**: invito agli ospiti, notifica di ogni conferma, conferma d'ordine, recupero password.
- **Pagamenti**: checkout Shopify (carrello Storefront API). Il webhook `orders/paid`, con firma HMAC verificata, attiva l'invito e invia la conferma.
- **Dashboard admin** su `/dashboard`: incassi, conversione, visite, email inviate. Protetta da `ADMIN_TOKEN`.

## Cosa gestisce Shopify, e cosa no

- **Shopify**: solo checkout, pagamento e registro dell'ordine.
- **InviteMe**: account, sessioni, builder, inviti, conferme, email, dashboard e metriche. Sono applicazione propria, non Shopify.

## Collegare Shopify

1. Crea un prodotto "Invito digitale" con una variante. Il prezzo effettivo è calcolato dall'app: il prezzo della variante serve solo al carrello.
2. Compila in `.env.local`: `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_STOREFRONT_TOKEN`, `SHOPIFY_VARIANT_ID`.
3. Crea un webhook `Ordini pagati` (`orders/paid`) verso `https://<tuo-dominio>/api/webhooks/shopify` e imposta `SHOPIFY_WEBHOOK_SECRET`.

## Collegare la posta

Crea un account [Resend](https://resend.com), verifica il dominio e imposta `RESEND_API_KEY`, `MAIL_FROM` e `APP_URL`.

## Struttura

- `app/` pagine (home, accedi, account, editor, invito pubblico, dashboard) e route API
- `components/` builder, invito, modelli, moduli di accesso e conferma, conto alla rovescia
- `lib/` catalogo e prezzi, autenticazione, posta, integrazione Shopify, archivio
- `scripts/smoke.mjs` test end-to-end

## Limiti noti

- **Archivio locale**: `data/db.json`. Va bene per un avvio controllato, ma va sostituito con un database (es. Postgres) prima di gestire molti clienti. Le funzioni sono raccolte in `lib/store.ts`.
- **Foto**: restano nel database come immagini compresse. Con molti clienti conviene uno storage di file dedicato.
- **Spedizione express**: è un add-on a pagamento, ma la consegna rapida è un processo operativo da gestire a mano.
- **Lingua**: l'interfaccia è in italiano. Il modello dati prevede già la lingua dell'invito, ma la traduzione dell'app non è ancora fatta.
- **Più valute e mercati**: l'app calcola in EUR. I mercati esteri richiedono la configurazione dei mercati in Shopify.
