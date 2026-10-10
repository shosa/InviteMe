import { PRICING, type AddonKey } from "./catalog";

export function totalCents(addons: string[]): number {
  return addons.reduce<number>((sum, key) => {
    const addon = PRICING.addons[key as AddonKey];
    return addon ? sum + addon.cents : sum;
  }, PRICING.basePriceCents);
}
