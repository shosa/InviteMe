import { NextResponse } from "next/server";
import { query, update, track, type Rsvp } from "@/lib/store";

// Risposta RSVP di un ospite a un invito pubblicato.
export async function POST(req: Request) {
  const { slug, answers } = (await req.json()) as {
    slug?: string;
    answers?: Record<string, string | number | boolean>;
  };
  if (!slug || !answers) return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });

  const inv = await query((db) => db.invitations.find((i) => i.slug === slug));
  if (!inv) return NextResponse.json({ error: "Invito non trovato" }, { status: 404 });

  const rsvp: Rsvp = {
    id: crypto.randomUUID(),
    invitationId: inv.id,
    createdAt: new Date().toISOString(),
    answers,
  };
  await update((db) => {
    db.rsvps.push(rsvp);
    track(db, "rsvp_submitted", inv.id);
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
