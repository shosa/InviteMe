import { notFound } from "next/navigation";
import { Invitation } from "@/components/Invitation";
import { RsvpForm } from "@/components/RsvpForm";
import { MODELS } from "@/lib/catalog";
import { query, update, track } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function PublicInvitation({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const inv = await query((db) => db.invitations.find((i) => i.slug === slug));
  if (!inv || inv.status !== "paid") notFound(); // gli inviti non pagati non sono pubblici

  // Conta la visualizzazione (metrica) senza bloccare il rendering.
  update((db) => {
    const row = db.invitations.find((i) => i.slug === slug);
    if (row) {
      row.views += 1;
      track(db, "invitation_viewed", row.id);
    }
  }).catch(() => undefined);

  const hasRsvp = MODELS.find((m) => m.id === inv.config.model)?.hasRsvp ?? false;

  return (
    <main className="public">
      <Invitation config={inv.config}>
        {hasRsvp && <RsvpForm slug={slug} questions={inv.config.rsvpQuestions} />}
      </Invitation>
      <p className="public-foot">Creato con InviteMe</p>
    </main>
  );
}
