import { redirect } from "next/navigation";

// La gestione dell'invito è nella pagina dell'invito: questo indirizzo resta valido e rimanda lì.
export default async function PlannerRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/invito/${id}`);
}
