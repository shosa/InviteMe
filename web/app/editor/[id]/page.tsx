import { notFound, redirect } from "next/navigation";
import { Builder, type Manage } from "@/components/Builder";
import { ApiError, apiServer } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const manage = await apiServer<Manage>(`/api/invitations/${id}/manage`);
    return <Builder initial={manage} />;
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect(`/accedi?next=${encodeURIComponent(`/editor/${id}`)}`);
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
}
