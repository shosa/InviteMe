import crypto from "crypto";
import { NextResponse } from "next/server";
import { createCheckout, localCheckoutAllowed, shopifyConfigured } from "@/lib/shopify";
import { PRICING, type AddonKey } from "@/lib/catalog";
import { totalCents } from "@/lib/pricing";
import { ownsInvitation } from "@/lib/auth";
import { query, update, track, type Order } from "@/lib/store";

export const dynamic = "force-dynamic";

// Avvia il checkout: carrello Shopify reale se configurato, altrimenti checkout di prova (solo se abilitato).
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { invitationId?: string };
  const inv = body.invitationId ? await query((db) => db.invitations.find((i) => i.id === body.invitationId)) : undefined;
  if (!inv) return NextResponse.json({ error: "Invito non trovato" }, { status: 404 });
  if (!(await ownsInvitation(inv))) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  if (inv.status === "paid") return NextResponse.json({ error: "Invito già pagato" }, { status: 409 });
  if (!shopifyConfigured() && !localCheckoutAllowed()) {
    return NextResponse.json({ error: "I pagamenti non sono ancora attivi su questo server" }, { status: 503 });
  }

  const addons = inv.config.addons.filter((a): a is AddonKey => a in PRICING.addons);
  const amount = totalCents(inv.config.model, addons);

  try {
    const checkout = await createCheckout({
      invitationId: inv.id,
      slug: inv.slug,
      addons,
      totalCents: amount,
      origin: new URL(req.url).origin,
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
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore checkout" }, { status: 502 });
  }
}
