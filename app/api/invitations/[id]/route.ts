import { NextResponse } from "next/server";
import { sanitizeConfig } from "@/lib/invitation";
import { ownsInvitation } from "@/lib/auth";
import { query, update } from "@/lib/store";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// Dati pubblici: l'utente proprietario e i dati ospiti non escono mai.
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const inv = await query((db) => db.invitations.find((i) => i.id === id));
  if (!inv) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  const { userId: _u, guests: _g, ...publicInvite } = inv;
  return NextResponse.json(publicInvite);
}

// Salva la configurazione. Solo il proprietario, e solo finché l'invito non è pagato.
export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const inv = await query((db) => db.invitations.find((i) => i.id === id));
  if (!inv) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  if (!(await ownsInvitation(inv))) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  if (inv.status === "paid") return NextResponse.json({ error: "Invito già pagato: non è più modificabile" }, { status: 409 });

  const config = sanitizeConfig(await req.json().catch(() => null));
  if (!config) return NextResponse.json({ error: "Configurazione non valida" }, { status: 400 });

  await update((db) => {
    const row = db.invitations.find((i) => i.id === id);
    if (row && row.status === "draft") row.config = config;
  });
  return NextResponse.json({ ok: true });
}
