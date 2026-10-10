import { NextResponse } from "next/server";
import { createCheckout } from "@/lib/shopify";
import { PRICING, type AddonKey } from "@/lib/catalog";
import { totalCents } from "@/lib/pricing";
import { query, update, track, type Order } from "@/lib/store";

// Avvia il checkout: carrello Shopify reale se configurato, altrimenti checkout locale.
export async function POST(req: Request) {
  const { invitationId } = (await req.json()) as { invitationId?: string };
  const inv = invitationId
    ? await query((db) => db.invitations.find((i) => i.id === invitationId))
    : undefined;
  if (!inv) return NextResponse.json({ error: "Invito non trovato" }, { status: 404 });

  const addons = inv.config.addons.filter((a): a is AddonKey => a in PRICING.addons);
  const amount = totalCents(addons);
  const origin = new URL(req.url).origin;

  try {
    const checkout = await createCheckout({
      invitationId: inv.id,
      slug: inv.slug,
      addons,
      totalCents: amount,
      origin,
    });
    const order: Order = {
      id: crypto.randomUUID(),
      invitationId: inv.id,
      createdAt: new Date().toISOString(),
      amountCents: amount,
      currency: PRICING.currency,
      source: checkout.source,
      status: "pending",
      checkoutUrl: checkout.checkoutUrl,
    };
    await update((db) => {
      db.orders.push(order);
      track(db, "checkout_started", inv.id);
    });
    return NextResponse.json({ checkoutUrl: checkout.checkoutUrl, orderId: order.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore checkout";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
