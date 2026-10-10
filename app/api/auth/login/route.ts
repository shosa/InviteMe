import { NextResponse } from "next/server";
import { startSession, verifyPassword } from "@/lib/auth";
import { query } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  const user = await query((db) => db.users.find((u) => u.email === email));
  // Risposta identica per email sconosciuta e password errata: nessun elenco di account.
  const ok = !!user && (await verifyPassword(body.password ?? "", user.passwordHash));
  if (!user || !ok) return NextResponse.json({ error: "Email o password non corretti" }, { status: 401 });

  await startSession(user.id);
  return NextResponse.json({ id: user.id, email: user.email, name: user.name });
}
