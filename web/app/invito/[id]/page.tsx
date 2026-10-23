import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Catalog, RsvpQuestion } from "@inviteme/shared";
import { Nav } from "@/components/Nav";
import { WelcomeDialog } from "@/components/dashboard/WelcomeDialog";
import { InviteHero } from "@/components/dashboard/InviteHero";
import { PlannerPanel, type PlannerData } from "@/components/planner/PlannerPanel";
import { ApiError, apiServer } from "@/lib/api";
import { getLang } from "@/lib/i18n";
import { accentOf, inkOn } from "@/lib/invitePalette";
import { themeDecor } from "@/lib/themeAssets";

export const dynamic = "force-dynamic";

type Summary = PlannerData["summary"];

// Pagina unica dell'invito: testata nei colori del template, gestione (conto alla rovescia, note, risposte, ospiti).
// Prima della pubblicazione mostra il pagamento. Dopo il pagamento il popup di benvenuto compare una volta.
export default async function InvitoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ benvenuto?: string }> }) {
  const { id } = await params;
  const { benvenuto } = await searchParams;
  let manage: PlannerData["manage"] & { catalog: Catalog };
  try {
    manage = await apiServer<PlannerData["manage"] & { catalog: Catalog }>(`/api/invitations/${id}/manage`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect(`/accedi?next=/invito/${id}`);
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const paid = manage.status === "paid";
  let summary: Summary = { total: 0, attending: 0, declined: 0, guests: 0, questions: [] as RsvpQuestion[], rsvps: [] };
  if (paid) summary = await apiServer<Summary>(`/api/invitations/${id}/rsvps`);

  const lang = await getLang();
  const h = await headers();
  const url = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? "localhost"}/i/${manage.slug}`;
  const theme = manage.catalog.themes.find((t) => t.manifest.id === manage.config.themeId)?.manifest;
  const color = theme?.themeColor ?? "#B98D5F";
  const ink = inkOn(color);
  const accent = accentOf(color);
  const decor = theme ? themeDecor(theme) : undefined;
  const title = String(manage.config.event.title ?? "") || (lang === "en" ? "Your invitation" : "Il vostro invito");
  const date = String(manage.config.event.eventDate ?? "");
  const when = date ? new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "it-IT", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00`)) : "";
  const venue = String(manage.config.event.venue ?? "");
  const T = lang === "en"
    ? { live: "Invitation online", draft: "Draft", pay: "Pay to publish", payText: "Your invitation is not online yet. Finish it and pay once to share the link.", edit: "Continue in the editor", noDate: "Date to be set", back: "Back to my invitations" }
    : { live: "Invito online", draft: "Bozza", pay: "Paga per pubblicare", payText: "L'invito non è ancora online. Completalo e paga una volta per condividere il link.", edit: "Continua nell'editor", noDate: "Data da definire", back: "Tutti i miei inviti" };

  return (
    <>
      <Nav current="account" lang={lang} />
      <main className="idash" style={{ "--inv": color, "--inv-ink": ink } as React.CSSProperties}>
        <InviteHero
          kicker={paid ? T.live : T.draft}
          title={title}
          when={`${when || T.noDate}${venue ? ` · ${venue}` : ""}`}
          ink={accent}
          backHref="/account"
          backLabel={T.back}
          decor={decor}
        />
        <div className="wrap idash-body">
          {paid ? (
            <PlannerPanel data={{ manage, summary }} lang={lang} />
          ) : (
            <section className="pl-panel pl-pay">
              <h2>{T.pay}</h2>
              <p className="hint">{T.payText}</p>
              <a className="pl-btn" href={`/editor/${manage.id}`}>{T.edit}</a>
            </section>
          )}
        </div>
      </main>
      {paid && <WelcomeDialog url={url} title={title} color={accent} lang={lang} open={benvenuto === "1"} />}
    </>
  );
}
