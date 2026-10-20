import { notFound, redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { PlannerPanel, type PlannerData } from "@/components/planner/PlannerPanel";
import { ApiError, apiServer } from "@/lib/api";
import { getLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

// Pannello di gestione dell'invito: risultati delle conferme, ospiti, conto alla rovescia e note.
export default async function Planner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const [manage, summary] = await Promise.all([
      apiServer<PlannerData["manage"]>(`/api/invitations/${id}/manage`),
      apiServer<PlannerData["summary"]>(`/api/invitations/${id}/rsvps`),
    ]);
    const lang = await getLang();
    if (manage.status !== "paid") redirect(`/editor/${id}`);
    return (
      <>
        <Nav current="account" lang={lang} />
        <PlannerPanel data={{ manage, summary }} lang={lang} />
      </>
    );
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect(`/accedi?next=${encodeURIComponent(`/planner/${id}`)}`);
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
}
