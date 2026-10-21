import { getAddon, getModel, type Catalog } from "./catalog";

// Totale = prezzo base del modello + funzioni acquistate a parte. Le funzioni già incluse non si pagano due volte.
// Viene sempre ricalcolato lato server dal catalogo effettivo: il prezzo mostrato non è mai considerato fidato.
export function totalCents(c: Catalog, model: string, selected: string[]): number {
  const m = getModel(c, model);
  if (!m) return 0;
  let total = m.priceCents;
  for (const key of new Set(selected)) {
    if (!m.options.includes(key as never)) continue;
    const addon = getAddon(c, key);
    if (addon) total += addon.cents;
  }
  return total;
}

// Solo le funzioni indicate (senza il prezzo base): è l'importo della differenza dopo l'acquisto.
export function addonsCents(c: Catalog, model: string, keys: string[]): number {
  const m = getModel(c, model);
  if (!m) return 0;
  let total = 0;
  for (const key of new Set(keys)) {
    if (!m.options.includes(key as never)) continue;
    const addon = getAddon(c, key);
    if (addon) total += addon.cents;
  }
  return total;
}
