import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, Eye, Pencil, Users } from "lucide-react";
import type { Catalog, InviteConfig } from "@inviteme/shared";
import { Nav } from "@/components/Nav";
import { CopyLink } from "@/components/CopyLink";
import { WelcomeDialog } from "@/components/dashboard/WelcomeDialog";
import { Confetti } from "@/components/dashboard/Clipart";
import { ApiError, apiServer } from "@/lib/api";
import { getLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type Inv = { id: string; slug: string; status: "draft" | "paid"; config: InviteConfig; guests: unknown[] | number; views: number; catalog: Catalog };

// Luce del colore dell'invito: testo chiaro sui fondi scuri, scuro sui chiari.
function inkOn(hex: string): string {
  const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#0E1116" : "#FFFFFF";
}

// Colore per le illustrazioni: se il colore dell'invito è chiaro, una versione più scura resta leggibile.
function accentOf(hex: string): string {
  if (inkOn(hex) === "#0E1116") return hex;
  const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const d = (c: number) => Math.round(c * 0.45).toString(16).padStart(2, "0");
  return `#${d((n >> 16) & 255)}${d((n >> 8) & 255)}${d(n & 255)}`;
}

// Dashboard personale di un invito: dopo il pagamento è la prima schermata, con il link da condividere.
export default async function InvitoDashboard({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ benvenuto?: string }> }) {
  const { id } = await params;
  const { benvenuto } = await searchParams;
  let inv: Inv;
  try {
    inv = await apiServer<Inv>(`/api/invitations/${id}/manage`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect(`/accedi?next=/invito/${id}`);
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  const lang = await getLang();
  const h = await headers();
  const url = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? "localhost"}/i/${inv.slug}`;
  const theme = inv.catalog.themes.find((t) => t.manifest.id === inv.config.themeId)?.manifest;
  const color = theme?.themeColor ?? "#14B8A6";
  const ink = inkOn(color);
  const accent = accentOf(color);
  const paid = inv.status === "paid";
  const guestCount = Array.isArray(inv.guests) ? inv.guests.length : Number(inv.guests);
  const title = String(inv.config.event.title ?? "") || (lang === "en" ? "Your invitation" : "Il vostro invito");
  const date = String(inv.config.event.eventDate ?? "");
  const when = date ? new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "it-IT", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00`)) : "";
  const T = lang === "en"
    ? { live: "Invitation online", draft: "Draft", pay: "Pay to publish", payText: "Your invitation is not online yet. Finish it and pay once to share the link.", edit: "Continue in the editor", share: "Share the link", shareText: "Send it to your guests: it opens on any phone.", open: "Open the invitation", visits: "Visits", guests: "Guests", manage: "Guests and replies", manageText: "Guest list, RSVP answers and the countdown.", modify: "Edit the invitation", modifyText: "Texts, blocks and photos stay editable while in draft.", place: "Venue", noDate: "Date to be set" }
    : { live: "Invito online", draft: "Bozza", pay: "Paga per pubblicare", payText: "L'invito non è ancora online. Completalo e paga una volta per condividere il link.", edit: "Continua nell'editor", share: "Condividi il link", shareText: "Mandalo agli ospiti: si apre da qualunque telefono.", open: "Apri l'invito", visits: "Visite", guests: "Ospiti", manage: "Ospiti e risposte", manageText: "Lista ospiti, risposte e conto alla rovescia.", modify: "Modifica l'invito", modifyText: "Testi, blocchi e foto restano modificabili finché è in bozza.", place: "Luogo", noDate: "Data da definire" };

  return (
    <>
      <Nav current="account" lang={lang} />
      <main className="idash" style={{ "--inv": color, "--inv-ink": ink } as React.CSSProperties}>
        <section className="idash-hero">
          <Confetti className="idash-confetti" color={ink} />
          <div className="wrap">
            <p className="idash-kicker">{paid ? T.live : T.draft}</p>
            <h1>{title}</h1>
            <p className="idash-when">{when || T.noDate}{inv.config.event.venue ? ` · ${inv.config.event.venue}` : ""}</p>
          </div>
        </section>

        <div className="wrap idash-body">
          {!paid && (
            <section className="idash-card idash-pay">
              <div>
                <h2>{T.pay}</h2>
                <p className="hint">{T.payText}</p>
              </div>
              <a className="btn solid" href={`/editor/${inv.id}`}>{T.edit}</a>
            </section>
          )}

          <section className="idash-card idash-share" aria-labelledby="share-title">
            <div>
              <h2 id="share-title">{T.share}</h2>
              <p className="hint">{T.shareText}</p>
            </div>
            <div className="idash-link">
              <code>{url}</code>
              <CopyLink path={`/i/${inv.slug}`} lang={lang} />
            </div>
            <div className="idash-actions">
              <a className="btn solid" href={`https://wa.me/?text=${encodeURIComponent(`${lang === "en" ? "You're invited! All the details here" : "Vi invitiamo! Trovate tutti i dettagli qui"}: ${url}`)}`} target="_blank" rel="noreferrer">WhatsApp</a>
              <a className="btn outline" href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`}>Email</a>
              {paid && <a className="btn ghost" href={`/i/${inv.slug}`} target="_blank" rel="noreferrer">{T.open}</a>}
            </div>
          </section>

          <section className="idash-stats" aria-label={lang === "en" ? "Summary" : "Riepilogo"}>
            <div className="idash-stat"><Eye size={18} aria-hidden="true" /><span>{T.visits}</span><strong>{inv.views}</strong></div>
            <div className="idash-stat"><Users size={18} aria-hidden="true" /><span>{T.guests}</span><strong>{guestCount}</strong></div>
          </section>

          <section className="idash-grid">
            {paid && (
              <a className="idash-card idash-link-card" href={`/planner/${inv.id}`}>
                <h3>{T.manage}</h3>
                <p className="hint">{T.manageText}</p>
                <span className="idash-go">{lang === "en" ? "Open" : "Apri"} <ArrowRight size={16} aria-hidden="true" /></span>
              </a>
            )}
            <a className="idash-card idash-link-card" href={`/editor/${inv.id}`}>
              <h3>{T.modify}</h3>
              <p className="hint">{T.modifyText}</p>
              <span className="idash-go">{lang === "en" ? "Open" : "Apri"} <Pencil size={16} aria-hidden="true" /></span>
            </a>
          </section>
        </div>
      </main>

      {paid && <WelcomeDialog url={url} title={title} color={accent} lang={lang} open={benvenuto === "1"} />}
    </>
  );
}
