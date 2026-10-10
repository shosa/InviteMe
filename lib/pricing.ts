import { MODELS, PRICING, type AddonKey, type ModelId } from "./catalog";

// Totale = prezzo del modello + add-on scelti. Il prezzo è sempre ricalcolato lato server.
export function totalCents(model: ModelId, addons: string[]): number {
  const base = MODELS.find((m) => m.id === model)?.priceCents ?? 0;
  return addons.reduce<number>((sum, key) => {
    const addon = PRICING.addons[key as AddonKey];
    return addon ? sum + addon.cents : sum;
  }, base);
}
