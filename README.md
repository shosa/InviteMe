# InviteMe

Servizio di inviti digitali: scegli un modello, personalizzalo nel builder con anteprima in tempo reale, paga e condividi un solo link con tutti gli ospiti. RSVP e metriche in dashboard.

## Avvio

```bash
npm install
npm run dev
```

Apri http://localhost:3000. Senza Shopify configurato il checkout è di prova: il pulsante "Simula pagamento riuscito" completa il flusso.

## Funzioni

- **Gallery** per tipologia: matrimoni, compleanni e baby shower, eventi aziendali, lauree.
- **Builder** con autosalvataggio: testi, colori, carattere, lingua, foto (fino a 3), programma (fino a 5 sezioni), domande RSVP, add-on (musica, mappa, conto alla rovescia, consegna express).
- **Pagina invito pubblica** su `/i/<slug>` con conto alla rovescia reale e form RSVP.
- **Dashboard** `/dashboard`: incasso, conversione, visualizzazioni, RSVP per template, aggiornamento live.
- **Shopify**: checkout tramite carrello Storefront API e webhook `orders/paid` con firma HMAC verificata.

## Collegare Shopify

1. Crea un prodotto "Invito digitale" con una variante a 65 € (o con prezzo per mercato, vedi Mercati).
2. Copia `.env.example` in `.env.local` e compila `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_STOREFRONT_TOKEN`, `SHOPIFY_VARIANT_ID`.
3. Nell'admin Shopify crea un webhook `Ordini pagati` (`orders/paid`) verso `https://<tuo-dominio>/api/webhooks/shopify` e copia il segreto in `SHOPIFY_WEBHOOK_SECRET`.
4. Gli add-on vengono inviati come attributi del carrello, così ogni ordine è collegato al suo invito.

## Struttura

- `app/` pagine e route API (`/api/invitations`, `/api/checkout`, `/api/rsvp`, `/api/metrics`, `/api/webhooks/shopify`)
- `components/` builder, invito, gallery, RSVP, conto alla rovescia
- `lib/` catalogo e prezzi, integrazione Shopify, store locale
- `data/db.json` archivio locale creato al primo utilizzo (ignorato da git)

## Note

- Lo store locale è un file JSON pensato per sviluppo e piccolo volume. In produzione va sostituito con un database; l'interfaccia è in `lib/store.ts`.
- I modelli sono originali. Le tipologie di evento seguono il modello di riferimento, ma layout, nomi e grafica sono nuovi.
