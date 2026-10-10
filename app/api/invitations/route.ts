import { NextResponse } from "next/server";
import { getTemplate } from "@/lib/catalog";
import { defaultConfig, makeSlug, type Invitation } from "@/lib/invitation";
import { track, update } from "@/lib/store";

// Crea una bozza d'invito a partire da un template.
export async function POST(req: Request) {
  const { templateId } = (await req.json()) as { templateId?: string };
  const template = templateId ? getTemplate(templateId) : undefined;
  if (!template) return NextResponse.json({ error: "Template non valido" }, { status: 400 });

  const config = defaultConfig(template.id, template.category);
  config.colors = { bg: template.palette.bg, ink: template.palette.ink, accent: template.palette.accent };
  config.font = template.font;

  const invitation: Invitation = {
    id: crypto.randomUUID(),
    slug: makeSlug(config.title),
    createdAt: new Date().toISOString(),
    config,
    status: "draft",
    views: 0,
  };

  await update((db) => {
    db.invitations.push(invitation);
    track(db, "invitation_created", invitation.id);
  });
  return NextResponse.json({ id: invitation.id, slug: invitation.slug }, { status: 201 });
}
