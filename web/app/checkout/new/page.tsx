import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { NewCheckout } from "@/components/checkout/NewCheckout";
import { apiPublic, apiServer } from "@/lib/api";
import { getLang } from "@/lib/i18n";
import type { Catalog } from "@inviteme/shared";

export const dynamic = "force-dynamic";

// Pagamento prima dell'invito: la scelta arriva dalla home. L'invito nasce solo dopo il pagamento riuscito.
export default async function Page({ searchParams }: { searchParams: Promise<{ model?: string; theme?: string; event?: string }> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]).toString();
  const me = await apiServer<{ user: { id: string } | null }>("/api/auth/me").catch(() => ({ user: null }));
  if (!me.user) redirect(`/accedi?next=${encodeURIComponent(`/checkout/new?${qs}`)}`);
  const catalog = (await apiPublic<Catalog>("/api/catalog")) ?? { models: [], addons: [], themes: [], music: [] };
  const lang = await getLang();
  return (
    <>
      <Nav lang={lang} />
      <NewCheckout catalog={catalog} lang={lang} model={sp.model ?? ""} theme={sp.theme ?? ""} event={sp.event ?? "wedding"} />
    </>
  );
}
