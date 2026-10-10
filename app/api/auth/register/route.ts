import crypto from "crypto";
import { NextResponse } from "next/server";
import { hashPassword, startSession } from "@/lib/auth";
import { update } from "@/lib/store";

export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string; name?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  const name = (body.name ?? "").trim().slice(0, 80);
  const password = body.password ?? "";
  if (!EMAIL.test(email)) return NextResponse.json({ error: "Inserisci un'email valida" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "La password deve avere almeno 8 caratteri" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Inserisci il tuo nome" }, { status: 400 });

  const passwordHash = await hashPassword(password);
  const created = await update((db) => {
    if (db.users.some((u) => u.email === email)) return null;
    const user = { id: crypto.randomUUID(), email, name, passwordHash, createdAt: new Date().toISOString() };
    db.users.push(user);
    return user;
  });
  if (!created) return NextResponse.json({ error: "Esiste già un account con questa email" }, { status: 409 });

  await startSession(created.id);
  return NextResponse.json({ id: created.id, email: created.email, name: created.name }, { status: 201 });
}
