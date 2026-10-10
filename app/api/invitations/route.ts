import crypto from "crypto";
import { NextResponse } from "next/server";
import { EVENT_TYPES, MODELS, STYLES, type EventType, type ModelId } from "@/lib/catalog";
import { defaultConfig, makeSlug, type Invitation } from "@/lib/invitation";
import { currentUser } from "@/lib/auth";
import { track, update } from "@/lib/store";

export const dynamic = "force-dynamic";

// Crea una bozza d'invito per l'utente loggato, dal modello e dallo stile scelti.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Accedi per creare un invito" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { model?: string; eventType?: string; styleId?: string };
  const model = MODELS.find((m) => m.id === body.model)?.id as ModelId | undefined;
  if (!model) return NextResponse.json({ error: "Modello non valido" }, { status: 400 });
  const eventType = (EVENT_TYPES.find((e) => e.id === body.eventType)?.id ?? "wedding") as EventType;

  const config = defaultConfig(model, eventType);
  config.styleId = STYLES.find((s) => s.id === body.styleId)?.id ?? STYLES[0].id;

  const invitation: Invitation = {
    id: crypto.randomUUID(),
    slug: makeSlug(config.title),
    userId: user.id,
    createdAt: new Date().toISOString(),
    config,
    status: "draft",
    views: 0,
    guests: [],
  };
  await update((db) => {
    db.invitations.push(invitation);
    track(db, "invitation_created", invitation.id);
  });
  return NextResponse.json({ id: invitation.id, slug: invitation.slug }, { status: 201 });
}
