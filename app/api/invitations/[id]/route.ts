import { NextResponse } from "next/server";
import type { InviteConfig } from "@/lib/invitation";
import { query, update } from "@/lib/store";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invitation = await query((db) => db.invitations.find((i) => i.id === id));
  if (!invitation) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  return NextResponse.json(invitation);
}

// Salva la configurazione del builder (testi, colori, foto, sezioni, RSVP, add-on).
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const config = (await req.json()) as InviteConfig;
  if (!config || typeof config.title !== "string") {
    return NextResponse.json({ error: "Configurazione non valida" }, { status: 400 });
  }
  const ok = await update((db) => {
    const inv = db.invitations.find((i) => i.id === id);
    if (!inv) return false;
    if (inv.status === "paid") return false; // l'invito pagato è bloccato
    inv.config = config;
    return true;
  });
  if (!ok) return NextResponse.json({ error: "Non modificabile" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
