import { NextResponse } from "next/server";
import { adminAllowed } from "@/lib/auth";
import { query } from "@/lib/store";

export const dynamic = "force-dynamic";

// Metriche aggregate per la dashboard admin: ordini, incasso, conversioni, RSVP.
export async function GET(req: Request) {
  if (!adminAllowed(req)) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const summary = await query((db) => {
    const paidOrders = db.orders.filter((o) => o.status === "paid");
    const paid = db.invitations.filter((i) => i.status === "paid").length;
    const rsvpByInvite = new Map<string, number>();
    for (const r of db.rsvps) rsvpByInvite.set(r.invitationId, (rsvpByInvite.get(r.invitationId) ?? 0) + 1);
    const byModel: Record<string, number> = {};
    for (const i of db.invitations) byModel[i.config.model] = (byModel[i.config.model] ?? 0) + 1;

    return {
      users: db.users.length,
      invitations: db.invitations.length,
      drafts: db.invitations.length - paid,
      paid,
      orders: paidOrders.length,
      revenueCents: paidOrders.reduce((s, o) => s + o.amountCents, 0),
      currency: "EUR",
      views: db.invitations.reduce((s, i) => s + i.views, 0),
      rsvps: db.rsvps.length,
      guestEmailsSent: db.invitations.reduce((s, i) => s + i.guests.length, 0),
      conversionRate: db.invitations.length ? paid / db.invitations.length : 0,
      checkoutsStarted: db.events.filter((e) => e.type === "checkout_started").length,
      byModel,
      recent: db.invitations
        .slice(-8)
        .reverse()
        .map((i) => ({
          id: i.id,
          slug: i.slug,
          title: i.config.title,
          model: i.config.model,
          status: i.status,
          views: i.views,
          rsvps: rsvpByInvite.get(i.id) ?? 0,
          createdAt: i.createdAt,
        })),
    };
  });
  return NextResponse.json(summary);
}
