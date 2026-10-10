import { NextResponse } from "next/server";
import { invitationIdFromOrder, verifyShopifyWebhook } from "@/lib/shopify";
import { orderEmail, sendMail } from "@/lib/mail";
import { formatPrice } from "@/lib/catalog";
import { query, track, update } from "@/lib/store";

export const dynamic = "force-dynamic";

// Webhook Shopify orders/paid: firma verificata, poi attiva l'invito, registra l'ordine e avvisa il cliente.
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyShopifyWebhook(raw, req.headers.get("x-shopify-hmac-sha256"))) {
    return NextResponse.json({ error: "Firma non valida" }, { status: 401 });
  }
  if (req.headers.get("x-shopify-topic") !== "orders/paid") return NextResponse.json({ ok: true, ignored: true });

  const order = JSON.parse(raw) as {
    id: number;
    name: string;
    total_price: string;
    currency: string;
    note_attributes?: { name: string; value: string }[];
    line_items?: { properties?: { name: string; value: string }[] }[];
  };
  const invitationId = invitationIdFromOrder(order);

  const result = await update((db) => {
    const inv = invitationId ? db.invitations.find((i) => i.id === invitationId) : undefined;
    if (inv && inv.status !== "paid") {
      inv.status = "paid";
      inv.orderRef = order.name;
    }
    db.orders.push({
      id: String(order.id),
      invitationId: invitationId ?? "unknown",
      createdAt: new Date().toISOString(),
      amountCents: Math.round(Number(order.total_price) * 100),
      currency: order.currency,
      source: "shopify",
      status: "paid",
    });
    track(db, "order_paid", invitationId);
    return inv ? { inv, userId: inv.userId, slug: inv.slug, title: inv.config.title } : null;
  });

  if (result) {
    const owner = await query((db) => db.users.find((u) => u.id === result.userId));
    if (owner) {
      await sendMail(
        orderEmail({
          to: owner.email,
          title: result.title,
          amount: formatPrice(Math.round(Number(order.total_price) * 100)),
          slug: result.slug,
        }),
      ).catch(() => undefined);
    }
  }
  return NextResponse.json({ ok: true });
}
