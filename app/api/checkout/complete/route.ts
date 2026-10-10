import { NextResponse } from "next/server";
import { localCheckoutAllowed, shopifyConfigured } from "@/lib/shopify";
import { ownsInvitation } from "@/lib/auth";
import { orderEmail, sendMail } from "@/lib/mail";
import { PRICING, formatPrice } from "@/lib/catalog";
import { totalCents } from "@/lib/pricing";
import { query, update, track } from "@/lib/store";

export const dynamic = "force-dynamic";

// Solo checkout di prova: segna l'invito come pagato. Disattivato con Shopify e in produzione
// (salvo ALLOW_LOCAL_CHECKOUT=true). Con Shopify il pagamento è confermato dal webhook.
export async function POST(req: Request) {
  if (shopifyConfigured() || !localCheckoutAllowed()) {
    return NextResponse.json({ error: "Checkout di prova non disponibile" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as { invitationId?: string };
  const inv = body.invitationId ? await query((db) => db.invitations.find((i) => i.id === body.invitationId)) : undefined;
  if (!inv) return NextResponse.json({ error: "Invito non trovato" }, { status: 404 });
  if (!(await ownsInvitation(inv))) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });

  const owner = await query((db) => db.users.find((u) => u.id === inv.userId));
  const amount = totalCents(inv.config.model, inv.config.addons.filter((a) => a in PRICING.addons));

  await update((db) => {
    const row = db.invitations.find((i) => i.id === inv.id);
    if (!row) return;
    row.status = "paid";
    row.orderRef = `TEST-${Date.now()}`;
    const order = db.orders.find((o) => o.invitationId === inv.id && o.status === "pending");
    if (order) order.status = "paid";
    track(db, "order_paid", inv.id);
  });
  if (owner) {
    await sendMail(orderEmail({ to: owner.email, title: inv.config.title, amount: formatPrice(amount), slug: inv.slug })).catch(() => undefined);
  }
  return NextResponse.json({ ok: true });
}
