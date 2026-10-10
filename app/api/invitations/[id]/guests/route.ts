import { NextResponse } from "next/server";
import { ownsInvitation } from "@/lib/auth";
import { inviteEmail, sendMail } from "@/lib/mail";
import { query, update } from "@/lib/store";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_PER_REQUEST = 100;

// Invia il link dell'invito agli ospiti indicati. Un solo link per tutti: l'email è solo il canale.
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const inv = await query((db) => db.invitations.find((i) => i.id === id));
  if (!inv) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  if (!(await ownsInvitation(inv))) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  if (inv.status !== "paid") {
    return NextResponse.json({ error: "Paga l'invito prima di inviarlo agli ospiti" }, { status: 409 });
  }

  const body = (await req.json().catch(() => ({}))) as { emails?: unknown; message?: unknown };
  const emails = (Array.isArray(body.emails) ? body.emails : [])
    .map((e) => String(e).trim().toLowerCase())
    .filter((e) => EMAIL.test(e));
  const unique = [...new Set(emails)].slice(0, MAX_PER_REQUEST);
  if (unique.length === 0) return NextResponse.json({ error: "Nessun indirizzo email valido" }, { status: 400 });
  const personal = typeof body.message === "string" ? body.message.slice(0, 500) : undefined;

  const sent: string[] = [];
  const failed: string[] = [];
  for (const to of unique) {
    try {
      await sendMail(inviteEmail({ to, hosts: inv.config.hosts, title: inv.config.title, slug: inv.slug, personal }));
      sent.push(to);
    } catch {
      failed.push(to);
    }
  }

  const now = new Date().toISOString();
  await update((db) => {
    const row = db.invitations.find((i) => i.id === id);
    if (!row) return;
    for (const email of sent) {
      if (!row.guests.some((g) => g.email === email)) row.guests.push({ email, sentAt: now });
    }
  });
  return NextResponse.json({ sent: sent.length, failed });
}
