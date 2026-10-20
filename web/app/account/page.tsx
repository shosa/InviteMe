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
export default async function Account() {
  let rows: Row[];
  let me: Me;
  try {
    [rows, me] = await Promise.all([apiServer<Row[]>("/api/account/invitations"), apiServer<Me>("/api/auth/me")]);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/accedi?next=/account");
    throw e;
  }

  const paid = rows.filter((r) => r.status === "paid").length;
  const totals = rows.reduce((t, r) => ({ views: t.views + r.views, rsvps: t.rsvps + r.rsvps, guests: t.guests + r.guests }), { views: 0, rsvps: 0, guests: 0 });
  const lang = await getLang();
  const t = ui(lang);
  const firstName = me.user?.name?.split(" ")[0] ?? "";

  return (
    <>
      <Nav current="account" lang={lang} />
      <main className="wrap dash">
        <header className="dash-head">
          <div>
            <p className="kicker">{t.dashKicker}</p>
            <h1>{firstName ? `${t.dashHello}, ${firstName}` : t.dashTitleFallback}</h1>
          </div>
          <a className="btn solid" href="/#modelli">{t.dashNew}</a>
        </header>

        <section className="kpis" aria-label="Riepilogo">
          <div className="kpi"><span>{t.kInvites}</span><strong>{rows.length}</strong><small>{t.kActiveDrafts(paid, rows.length - paid)}</small></div>
          <div className="kpi"><span>{t.kViews}</span><strong>{totals.views}</strong><small>{t.kViewsSub}</small></div>
          <div className="kpi"><span>{t.kReplies}</span><strong>{totals.rsvps}</strong><small>{t.kRepliesSub}</small></div>
          <div className="kpi"><span>{t.kGuests}</span><strong>{totals.guests}</strong><small>{t.kGuestsSub}</small></div>
        </section>

        <section aria-labelledby="dash-inviti">
          <h2 id="dash-inviti" className="dash-sub">{t.listTitle}</h2>
          {rows.length === 0 ? (
            <div className="empty">
              <h3>{t.emptyTitle}</h3>
              <p className="lede">{t.emptyText}</p>
              <a className="btn solid" href="/#modelli">{t.chooseStyle}</a>
            </div>
          ) : (
            <ul className="invite-cards">
              {rows.map((r) => (
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
                    <a className="btn solid small" href={`/editor/${r.id}`}>{r.status === "paid" ? t.manage : t.edit}</a>
                    {r.status === "paid" && <a className="btn outline small" href={`/i/${r.slug}`}>{t.viewInvite}</a>}
                    {r.status === "paid" && <CopyLink path={`/i/${r.slug}`} lang={lang} />}
                    {r.status === "paid" && <a className="btn outline small" href={`/planner/${r.id}`}>{t.managePlanner}</a>}
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
