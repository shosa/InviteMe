import { notFound, redirect } from "next/navigation";
import { Builder } from "@/components/Builder";
import { currentUser, ownsInvitation } from "@/lib/auth";
import { query } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect(`/accedi?next=${encodeURIComponent(`/editor/${id}`)}`);

  const inv = await query((db) => db.invitations.find((i) => i.id === id));
  if (!inv) notFound();
  if (!(await ownsInvitation(inv))) notFound(); // non rivela che l'invito esiste

  return (
    <Builder
      initial={{ id: inv.id, slug: inv.slug, config: inv.config, status: inv.status, guests: inv.guests }}
    />
  );
}
