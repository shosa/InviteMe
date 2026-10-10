import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { MODELS } from "@/lib/catalog";
import { currentUser } from "@/lib/auth";
import { query } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Account() {
  const user = await currentUser();
  if (!user) redirect("/accedi?next=/account");

  const mine = await query((db) => {
    const rows = db.invitations.filter((i) => i.userId === user.id).slice().reverse();
    return rows.map((i) => ({
      id: i.id,
      slug: i.slug,
      title: i.config.title,
      model: MODELS.find((m) => m.id === i.config.model)?.name ?? i.config.model,
      status: i.status,
      views: i.views,
      guests: i.guests.length,
      rsvps: db.rsvps.filter((r) => r.invitationId === i.id).length,
      date: i.config.eventDate,
    }));
  });

  return (
    <>
      <Nav current="account" />
      <main className="wrap account">
        <header className="account-head">
          <div>
            <p className="eyebrow">Il tuo account</p>
            <h1>Ciao {user.name.split(" ")[0]}, ecco i tuoi inviti.</h1>
          </div>
          <a className="btn solid" href="/#modelli">Nuovo invito</a>
        </header>

        {mine.length === 0 ? (
          <div className="empty">
            <h2>Nessun invito ancora</h2>
            <p className="lede">Scegliete un modello e iniziate: il primo invito si crea in pochi minuti.</p>
            <a className="btn solid" href="/#modelli">Scegli un modello</a>
          </div>
        ) : (
          <div className="invite-list">
            {mine.map((r) => (
              <article key={r.id} className="invite-row">
                <div className="invite-main">
                  <p className="eyebrow">{r.model}</p>
                  <h2>{r.title}</h2>
                  <p className="hint">Data {r.date}</p>
                </div>
                <dl className="invite-stats">
                  <div><dt>Stato</dt><dd><span className={`pill ${r.status === "paid" ? "yes" : "draft"}`}>{r.status === "paid" ? "Attivo" : "Bozza"}</span></dd></div>
                  <div><dt>Visite</dt><dd>{r.views}</dd></div>
                  <div><dt>Ospiti invitati</dt><dd>{r.guests}</dd></div>
                  <div><dt>Risposte</dt><dd>{r.rsvps}</dd></div>
                </dl>
                <div className="invite-actions">
                  <a className="btn solid small" href={`/editor/${r.id}`}>{r.status === "paid" ? "Gestisci" : "Modifica"}</a>
                  <a className="btn outline small" href={`/i/${r.slug}`}>Vedi invito</a>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
