import { notFound } from "next/navigation";
import { Builder } from "@/components/Builder";
import { getTemplate } from "@/lib/catalog";
import { query } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = await query((db) => db.invitations.find((i) => i.id === id));
  if (!inv) notFound();
  const template = getTemplate(inv.config.templateId);
  if (!template) notFound();

  return (
    <Builder
      template={template}
      initial={{ id: inv.id, slug: inv.slug, config: inv.config, status: inv.status }}
    />
  );
}
