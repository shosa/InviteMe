import { NextResponse } from "next/server";
import { ownsInvitation } from "@/lib/auth";
import { query } from "@/lib/store";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// Risposte RSVP per il proprietario: riepilogo JSON oppure CSV (?format=csv).
export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  const inv = await query((db) => db.invitations.find((i) => i.id === id));
  if (!inv) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  if (!(await ownsInvitation(inv))) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });

  const rsvps = await query((db) => db.rsvps.filter((r) => r.invitationId === id));
  const questions = inv.config.rsvpQuestions;

  if (new URL(req.url).searchParams.get("format") === "csv") {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["Ricevuta il", ...questions.map((q) => q.label)];
    const lines = rsvps.map((r) =>
      [
        new Date(r.createdAt).toLocaleString("it-IT"),
        ...questions.map((q) => {
          const a = r.answers[q.id];
          return q.type === "yes-no" ? (a === true ? "Sì" : a === false ? "No" : "") : a;
        }),
      ]
        .map(esc)
        .join(","),
    );
    // BOM UTF-8: Excel apre correttamente accenti e simboli
    return new NextResponse("﻿" + [header.map(esc).join(","), ...lines].join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="rsvp-${inv.slug}.csv"`,
      },
    });
  }

  const yes = rsvps.filter((r) => r.answers.attending === true);
  return NextResponse.json({
    total: rsvps.length,
    attending: yes.length,
    declined: rsvps.filter((r) => r.answers.attending === false).length,
    guests: yes.reduce((s, r) => s + (Number(r.answers.guests) || 1), 0),
    questions,
    rsvps: rsvps.map((r) => ({ id: r.id, createdAt: r.createdAt, answers: r.answers })),
  });
}
