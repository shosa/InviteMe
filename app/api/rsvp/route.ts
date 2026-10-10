import { NextResponse } from "next/server";
import { rsvpNoticeEmail, sendMail } from "@/lib/mail";
import { MODELS } from "@/lib/catalog";
import { query, update, track, type Rsvp } from "@/lib/store";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// Conferma di presenza di un ospite. Notifica il proprietario via email.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    slug?: string;
    answers?: Record<string, string | number | boolean>;
  };
  if (!body.slug || !body.answers || typeof body.answers !== "object") {
    return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
  }

  const found = await query((db) => {
    const inv = db.invitations.find((i) => i.slug === body.slug);
    const owner = inv ? db.users.find((u) => u.id === inv.userId) : undefined;
    return { inv, owner };
  });
  if (!found.inv) return NextResponse.json({ error: "Invito non trovato" }, { status: 404 });
  const hasRsvp = MODELS.find((m) => m.id === found.inv!.config.model)?.hasRsvp ?? false;
  if (!hasRsvp) return NextResponse.json({ error: "Questo invito non prevede conferma di presenza" }, { status: 400 });

  // Solo le risposte alle domande configurate vengono salvate.
  const allowed = new Set(found.inv.config.rsvpQuestions.map((q) => q.id));
  const answers = Object.fromEntries(
    Object.entries(body.answers)
      .filter(([k, v]) => allowed.has(k) && (typeof v === "string" || typeof v === "number" || typeof v === "boolean"))
      .map(([k, v]) => [k, typeof v === "string" ? v.slice(0, 500) : v]),
  );

  const rsvp: Rsvp = {
    id: crypto.randomUUID(),
    invitationId: found.inv.id,
    createdAt: new Date().toISOString(),
    answers,
  };
  await update((db) => {
    db.rsvps.push(rsvp);
    track(db, "rsvp_submitted", found.inv!.id);
  });

  if (found.owner) {
    await sendMail(
      rsvpNoticeEmail({
        to: found.owner.email,
        title: found.inv.config.title,
        attending: answers.attending === true,
        invitationId: found.inv.id,
      }),
    ).catch(() => undefined); // una mail non partita non deve bloccare la risposta dell'ospite
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
