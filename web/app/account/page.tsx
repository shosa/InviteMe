import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { ApiError, apiServer } from "@/lib/api";

export const dynamic = "force-dynamic";

type Row = { id: string; slug: string; status: "draft" | "paid"; title: string; eventDate: string; model: string; views: number; guests: number; rsvps: number };

export default async function Account() {
  let rows: Row[];
  try {
    rows = await apiServer<Row[]>("/api/account/invitations");
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/accedi?next=/account");
    throw e;
  }

  return (
    <>
      <Nav current="account" />
      <main className="wrap account">
        <header className="account-head">
          <div>
            <h1>I tuoi inviti</h1>
          </div>
          <a className="btn solid" href="/#modelli">Nuovo invito</a>
        </header>

        {rows.length === 0 ? (
          <div className="empty">
            <h2>Nessun invito ancora</h2>
            <p className="lede">Scegli un modello e personalizzalo: il primo invito si crea in pochi minuti.</p>
            <a className="btn solid" href="/#modelli">Scegli un modello</a>
          </div>
        ) : (
          <div className="invite-list">
            {rows.map((r) => (
              <article key={r.id} className="invite-row">
                <div className="invite-main">
                  <h2>{r.title}</h2>
                  <p className="hint">Data {r.eventDate}</p>
                </div>
                <dl className="invite-stats">
                  <div><dt>Stato</dt><dd><span className={`pill ${r.status === "paid" ? "yes" : "draft"}`}>{r.status === "paid" ? "Attivo" : "Bozza"}</span></dd></div>
                  <div><dt>Visite</dt><dd>{r.views}</dd></div>
                  <div><dt>Ospiti invitati</dt><dd>{r.guests}</dd></div>
                  <div><dt>Risposte</dt><dd>{r.rsvps}</dd></div>
                </dl>
                <div className="invite-actions">
                  <a className="btn solid small" href={`/editor/${r.id}`}>{r.status === "paid" ? "Gestisci" : "Modifica"}</a>
                  {r.status === "paid" && <a className="btn outline small" href={`/i/${r.slug}`}>Vedi invito</a>}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
