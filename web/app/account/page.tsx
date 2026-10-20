import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { CopyLink } from "@/components/CopyLink";
import { DeleteDraft } from "@/components/DeleteDraft";
import { ApiError, apiServer } from "@/lib/api";
import { getLang } from "@/lib/i18n";
import { ui } from "@/lib/ui";

export const dynamic = "force-dynamic";

type Row = { id: string; slug: string; status: "draft" | "paid"; title: string; eventDate: string; model: string; views: number; guests: number; rsvps: number };
type Me = { user: { name: string; email: string; role: string } | null };

// Dashboard del cliente: panoramica dei suoi inviti e azioni rapide per ciascuno.
export default async function Account({ searchParams }: { searchParams: Promise<{ stato?: string }> }) {
  const { stato } = await searchParams;
  let rows: Row[];
  let me: Me;
  try {
    [rows, me] = await Promise.all([apiServer<Row[]>("/api/account/invitations"), apiServer<Me>("/api/auth/me")]);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/accedi?next=/account");
    throw e;
  }

  const paid = rows.filter((r) => r.status === "paid").length;
  const lang = await getLang();
  const t = ui(lang);
  const filter = stato === "bozze" || stato === "attivi" ? stato : "tutti";
  const shown = filter === "tutti" ? rows : rows.filter((r) => (filter === "attivi" ? r.status === "paid" : r.status !== "paid"));
  const labels = lang === "en" ? { all: "All", drafts: "Drafts", active: "Active" } : { all: "Tutti", drafts: "Bozze", active: "Attivi" };

  return (
    <>
      <Nav current="account" lang={lang} />
      <main className="wrap dash">
        <header className="dash-head">
          <div>
            <h1>{t.myInvites}</h1>
            <p className="hint">{t.kActiveDrafts(paid, rows.length - paid)}</p>
          </div>
          <a className="btn solid" href="/#modelli">{t.dashNew}</a>
        </header>

        <nav className="dash-filter" aria-label={t.listTitle}>
          <a href="/account" className={filter === "tutti" ? "is-on" : undefined} aria-current={filter === "tutti" ? "page" : undefined}>{labels.all}</a>
          <a href="/account?stato=bozze" className={filter === "bozze" ? "is-on" : undefined} aria-current={filter === "bozze" ? "page" : undefined}>{labels.drafts}</a>
          <a href="/account?stato=attivi" className={filter === "attivi" ? "is-on" : undefined} aria-current={filter === "attivi" ? "page" : undefined}>{labels.active}</a>
        </nav>

        <section aria-label={t.listTitle}>
          {rows.length === 0 ? (
            <div className="empty">
              <h3>{t.emptyTitle}</h3>
              <p className="lede">{t.emptyText}</p>
              <a className="btn solid" href="/#modelli">{t.chooseStyle}</a>
            </div>
          ) : (
            <ul className="invite-cards">
              {shown.map((r) => (
                <li key={r.id} className="invite-card">
                  <div className="invite-card-head">
                    <div>
                      <h3>{r.title}</h3>
                      <p className="hint">{r.eventDate ? t.onDate(r.eventDate) : t.dateTbd}</p>
                    </div>
                    <span className={`pill ${r.status === "paid" ? "yes" : "draft"}`}>{r.status === "paid" ? t.active : t.draft}</span>
                  </div>
                  <dl className="invite-stats">
                    <div><dt>{t.visits}</dt><dd>{r.views}</dd></div>
                    <div><dt>{t.replies}</dt><dd>{r.rsvps}</dd></div>
                    <div><dt>{t.guests}</dt><dd>{r.guests}</dd></div>
                  </dl>
                  <div className="invite-actions">
                    <a className="btn solid small" href={r.status === "paid" ? `/invito/${r.id}` : `/editor/${r.id}`}>{r.status === "paid" ? t.manage : t.edit}</a>
                    {r.status === "paid" && <a className="btn outline small" href={`/i/${r.slug}`}>{t.viewInvite}</a>}
                    {r.status === "paid" && <CopyLink path={`/i/${r.slug}`} lang={lang} />}
                    {r.status === "paid" && <a className="btn outline small" href={`/invito/${r.id}`}>{t.managePlanner}</a>}
                    {r.status !== "paid" && <DeleteDraft id={r.id} lang={lang} />}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
