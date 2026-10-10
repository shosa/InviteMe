import { NextResponse } from "next/server";
import { invitationIdFromOrder, verifyShopifyWebhook } from "@/lib/shopify";
import { track, update } from "@/lib/store";

// Webhook Shopify orders/paid: firma verificata, poi attiva l'invito e registra la metrica.
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyShopifyWebhook(raw, req.headers.get("x-shopify-hmac-sha256"))) {
    return NextResponse.json({ error: "Firma non valida" }, { status: 401 });
  }

  const topic = req.headers.get("x-shopify-topic");
  const order = JSON.parse(raw) as {
    id: number;
    name: string;
    total_price: string;
    currency: string;
    note_attributes?: { name: string; value: string }[];
    line_items?: { properties?: { name: string; value: string }[] }[];
  };

  if (topic !== "orders/paid") return NextResponse.json({ ok: true, ignored: topic });

  const invitationId = invitationIdFromOrder(order);
  await update((db) => {
    const inv = invitationId ? db.invitations.find((i) => i.id === invitationId) : undefined;
    if (inv) {
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
  });
  return NextResponse.json({ ok: true });
}
