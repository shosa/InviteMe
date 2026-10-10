import { NextResponse } from "next/server";
import { consumeResetToken, hashPassword, startSession } from "@/lib/auth";
import { update } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { token?: string; password?: string };
  const password = body.password ?? "";
  if (password.length < 8) return NextResponse.json({ error: "La password deve avere almeno 8 caratteri" }, { status: 400 });
  if (!body.token) return NextResponse.json({ error: "Link non valido" }, { status: 400 });

  const userId = await consumeResetToken(body.token);
  if (!userId) return NextResponse.json({ error: "Il link è scaduto o già usato. Richiedine uno nuovo." }, { status: 400 });

  const passwordHash = await hashPassword(password);
  await update((db) => {
    const u = db.users.find((x) => x.id === userId);
    if (u) u.passwordHash = passwordHash;
    db.sessions = db.sessions.filter((s) => s.userId !== userId); // chiude le altre sessioni
  });
  await startSession(userId);
  return NextResponse.json({ ok: true });
}
