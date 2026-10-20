# Prompt per le illustrazioni degli stili

Ogni stile usa un set di illustrazioni. Oggi `notte`, `salvia` e `carta` condividono gli asset di `invitereference` tramite link simbolico (`themes/<id>/assets -> ../invitereference/assets`). Per dare a uno stile le sue illustrazioni: **prima sostituisci il link con una cartella vera**, poi metti i file con i nomi indicati.

```bash
cd themes/<id>
rm assets                # elimina solo il link simbolico, non la cartella condivisa
mkdir assets && cp -r ../invitereference/assets/. assets/
```

Poi genera le immagini in ChatGPT con i prompt qui sotto e sostituisci i file mantenendo lo stesso nome e le stesse dimensioni. Verifica sempre con `npm run validate-theme -w @inviteme/api -- themes/<id>`.

## Regole comuni a tutti i prompt

- Niente persone riconoscibili, niente testo o lettere nell'immagine, niente loghi.
- Sfondo trasparente dove indicato (PNG). Per le foto di sfondo: JPEG.
- Stile: illustrazione botanica acquerellata, linee sottili, nessun effetto 3D.

## Stile Notte (scuro)

| File | Dimensioni | Prompt |
|---|---|---|
| `floral-corner.png` | 800×800 PNG, sfondo trasparente | Angolo floreale elegante in angolo, rose bianche e foglie di eucalipto argentato, acquerello su velluto nero, illuminazione dorata tenue, stile botanico di lusso |
| `floral.png` | 1200×600 PNG, sfondo trasparente | Ghirlanda orizzontale di rose bianche ed eucalipto argentato, con piccoli fiori, acquerello delicato, sfondo trasparente |
| `floral-sprig.png` | 600×600 PNG, sfondo trasparente | Rametto singolo con due fiori bianchi e foglie di eucalipto, linee sottili, dettaglio botanico |
| `ornament.svg` | 180×60 SVG | Fregio orizzontale dorato con losanga centrale e due volute, linea sottile, solo contorni |
| `finial.svg` | 60×70 SVG | Puntale a boccia dorata, stile classico, solo contorno |

## Stile Salvia (verde)

| File | Dimensioni | Prompt |
|---|---|---|
| `floral-corner.png` | 800×800 PNG, sfondo trasparente | Angolo di rami di salvia e fiori di campo bianchi, acquerello verde chiaro, foglie sovrapposte, stile naturalistico |
| `floral.png` | 1200×600 PNG, sfondo trasparente | Ghirlanda aperta di foglie di salvia e fiori bianchi, acquerello verde, sfondo trasparente |
| `floral-sprig.png` | 600×600 PNG, sfondo trasparente | Rametto di salvia con tre fiori piccoli, linee sottili, verde salvia |
| `ornament.svg` | 180×60 SVG | Fregio orizzontale verde salvia con foglia centrale e due volute, solo contorni |
| `finial.svg` | 60×70 SVG | Puntale a foglia verde salvia, solo contorno |

## Stile Carta (minimale)

Lo stile Carta usa pochi ornamenti: si può anche non sostituire nulla e usare solo fregi sottili.

| File | Dimensioni | Prompt |
|---|---|---|
| `ornament.svg` | 180×60 SVG | Fregio orizzontale sottile in nero inchiostro, una losanga al centro, due tratti laterali, nessun colore |
| `finial.svg` | 60×70 SVG | Puntale essenziale a goccia, un solo tratto nero, senza decorazioni |

## Foto di copertina e sfondi (tutti gli stili)

Le foto degli esempi (`hero.jpg`, `location.jpg`, `noi-1..4.jpg`, `intro.mp4`) rappresentano una coppia reale: **non vanno usate in uno stile da vendere**. Sostituiscile con immagini generate senza persone riconoscibili, per esempio:

| File | Dimensioni | Prompt |
|---|---|---|
| `hero.jpg` | 1200×1800 JPEG | Arco di pietra chiara in un giardino al tramonto, palme, tende di velo bianco ai lati, nessuna persona, luce calda |
| `location.jpg` | 1200×1200 JPEG | Sala ricevimento con tavoli apparecchiati, candele e fiori bianchi, nessuna persona, luce soffusa |
| `noi-1.jpg`…`noi-4.jpg` | 800×1000 JPEG | Quattro dettagli: mani che si toccano sfocate, fiori su un tavolo, due calici, un dettaglio di pizzo; niente volti |

## Controllo prima del rilascio

- [ ] nessun file della cartella condivisa `invitereference/assets` è usato da più stili senza che sia voluto
- [ ] nessuna persona riconoscibile in nessuna immagine
- [ ] i nomi e le dimensioni corrispondono alla tabella
- [ ] `validate-theme` passa senza errori
