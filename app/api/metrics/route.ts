import { NextResponse } from "next/server";
import { query } from "@/lib/store";

// Metriche aggregate per la dashboard: ordini, incasso, conversioni, RSVP.
export async function GET() {
  const summary = await query((db) => {
    const paidOrders = db.orders.filter((o) => o.status === "paid");
    const revenueCents = paidOrders.reduce((s, o) => s + o.amountCents, 0);
    const views = db.invitations.reduce((s, i) => s + i.views, 0);
    const drafts = db.invitations.filter((i) => i.status === "draft").length;
    const paid = db.invitations.filter((i) => i.status === "paid").length;
    const rsvpByInvite = new Map<string, number>();
    for (const r of db.rsvps) rsvpByInvite.set(r.invitationId, (rsvpByInvite.get(r.invitationId) ?? 0) + 1);
    const byCategoryTemplate: Record<string, number> = {};
    for (const i of db.invitations) byCategoryTemplate[i.config.templateId] = (byCategoryTemplate[i.config.templateId] ?? 0) + 1;

    return {
      invitations: db.invitations.length,
      drafts,
      paid,
      orders: paidOrders.length,
      revenueCents,
      currency: "EUR",
      views,
      rsvps: db.rsvps.length,
      conversionRate: db.invitations.length ? paid / db.invitations.length : 0,
      checkoutsStarted: db.events.filter((e) => e.type === "checkout_started").length,
      byTemplate: byCategoryTemplate,
      recent: db.invitations
        .slice(-8)
        .reverse()
        .map((i) => ({
          id: i.id,
          slug: i.slug,
          title: i.config.title,
          status: i.status,
          views: i.views,
          rsvps: rsvpByInvite.get(i.id) ?? 0,
          createdAt: i.createdAt,
        })),
    };
  });
  return NextResponse.json(summary);
}
