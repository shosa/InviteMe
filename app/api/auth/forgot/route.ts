import { NextResponse } from "next/server";
import { createResetToken } from "@/lib/auth";
import { resetEmail, sendMail } from "@/lib/mail";
import { query } from "@/lib/store";

export const dynamic = "force-dynamic";

// Risponde sempre allo stesso modo: non rivela quali email hanno un account.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  const user = await query((db) => db.users.find((u) => u.email === email));
  if (user) {
    const token = await createResetToken(user.id);
    await sendMail(resetEmail({ to: user.email, token }));
  }
  return NextResponse.json({ ok: true });
}
