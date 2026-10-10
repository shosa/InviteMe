import { NextResponse } from "next/server";
import { update, track } from "@/lib/store";

// Solo per il checkout locale (senza Shopify configurato): segna l'ordine come pagato.
// Con Shopify attivo questo endpoint rifiuta: il pagamento è confermato dal webhook.
export async function POST(req: Request) {
  if (process.env.SHOPIFY_STORE_DOMAIN) {
    return NextResponse.json({ error: "Usa il checkout Shopify" }, { status: 403 });
  }
  const { invitationId } = (await req.json()) as { invitationId?: string };
  if (!invitationId) return NextResponse.json({ error: "invitationId mancante" }, { status: 400 });

  const ok = await update((db) => {
    const inv = db.invitations.find((i) => i.id === invitationId);
    if (!inv) return false;
    inv.status = "paid";
    inv.orderRef = `LOCAL-${Date.now()}`;
    const order = db.orders.find((o) => o.invitationId === invitationId && o.status === "pending");
    if (order) order.status = "paid";
    track(db, "order_paid", invitationId);
    return true;
  });
  if (!ok) return NextResponse.json({ error: "Invito non trovato" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
