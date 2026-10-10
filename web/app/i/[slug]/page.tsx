import { notFound } from "next/navigation";
import type { AddonKey, InviteConfig, StyleDef } from "@inviteme/shared";
import { Experience } from "@/components/Experience";
import { Invitation } from "@/components/Invitation";
import { RsvpForm } from "@/components/RsvpForm";
import { apiPublic } from "@/lib/api";

export const dynamic = "force-dynamic";

type Public = { config: InviteConfig; style: StyleDef; hasRsvp: boolean; musicSrc: string | null; features: AddonKey[] };

export default async function PublicInvitation({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const inv = await apiPublic<Public>(`/api/public/invitations/${encodeURIComponent(slug)}`);
  if (!inv) notFound();

  return (
    <main className="public">
      <Experience title={inv.config.title} accent={inv.style.accent} paper={inv.style.bg} ink={inv.style.ink} musicSrc={inv.musicSrc} cover={inv.style.motion?.cover !== "none"} coverStyle={inv.style.motion?.cover === "curtain" ? "curtain" : "envelope"} reveal={inv.style.motion?.reveal ?? "fade"}>
        <Invitation config={inv.config} style={inv.style} features={inv.features}>
          {inv.hasRsvp && <RsvpForm slug={slug} questions={inv.config.rsvpQuestions} />}
        </Invitation>
      </Experience>
      <p className="public-foot">Creato con InviteMe</p>
    </main>
  );
}
