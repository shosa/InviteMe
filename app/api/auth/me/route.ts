import { NextResponse } from "next/server";
import { currentUser, endSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
}

export async function DELETE() {
  await endSession();
  return NextResponse.json({ ok: true });
}
