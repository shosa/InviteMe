"use client";

import { useMemo, useState } from "react";
import type { InviteConfig, RsvpQuestion } from "@inviteme/shared";
import { CopyLink } from "../CopyLink";
import { ui, type Lang } from "@/lib/ui";

export type PlannerData = {
  manage: { id: string; slug: string; status: "draft" | "paid"; config: InviteConfig; guests: { email: string; sentAt: string }[]; planner: { notes: string; countdownNote: string } };
  summary: { total: number; attending: number; declined: number; guests: number; questions: RsvpQuestion[]; rsvps: { id: string; createdAt: string; answers: Record<string, string | number | boolean> }[] };
};

// Giorni che mancano alla data dell'evento (negativo se è passata).
function daysUntil(iso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const target = new Date(`${iso}T12:00:00`).getTime();
  const today = new Date(new Date().toDateString()).getTime();
  return Math.round((target - today) / 86_400_000);
}

export function PlannerPanel({ data, lang = "it" }: { data: PlannerData; lang?: Lang }) {
  const { manage, summary } = data;
  const L = ui(lang).planner;
  const title = String(manage.config.event.title ?? "Il tuo invito");
  const eventDate = String(manage.config.event.eventDate ?? "");
  const eventTime = String(manage.config.event.eventTime ?? "");
  const days = daysUntil(eventDate);
  const [notes, setNotes] = useState(manage.planner.notes ?? "");
  const [countdownNote, setCountdownNote] = useState(manage.planner.countdownNote ?? "");
  const [saved, setSaved] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const sent = manage.guests.length;
  const pending = Math.max(0, sent - summary.total);
  const questions = useMemo(() => summary.questions, [summary.questions]);
  const shareHref = `/i/${manage.slug}`;

  async function save() {
    setSaved("saving");
    const res = await fetch(`/api/invitations/${manage.id}/planner`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notes, countdownNote }) });
    setSaved(res.ok ? "ok" : "error");
    setTimeout(() => setSaved("idle"), 2400);
  }

  return (
    <main className="wrap planner">
      <header className="planner-head">
        <div>
          <p className="kicker">{L.kicker}</p>
          <h1>{title}</h1>
          <p className="hint">{eventDate ? `${eventDate}${eventTime ? ` alle ${eventTime}` : ""}` : "Data da impostare"}</p>
        </div>
        <div className="planner-actions">
          <a className="btn outline small" href={shareHref}>{L.view}</a>
          <CopyLink path={shareHref} />
          <a className="btn solid small" href={`/editor/${manage.id}`}>{L.edit}</a>
        </div>
      </header>

      <section className="kpis" aria-label="Riepilogo risposte">
        <div className="kpi"><span>{L.invited}</span><strong>{sent}</strong><small>{L.invitedSub}</small></div>
        <div className="kpi"><span>{L.replied}</span><strong>{summary.total}</strong><small>{L.repliedSub(pending)}</small></div>
        <div className="kpi"><span>{L.present}</span><strong>{summary.attending}</strong><small>{L.presentSub(summary.declined)}</small></div>
        <div className="kpi"><span>{L.people}</span><strong>{summary.guests}</strong><small>{L.peopleSub}</small></div>
      </section>

      <div className="planner-grid">
        <section className="planner-card countdown" aria-labelledby="pl-count">
          <h2 id="pl-count">{L.countdown}</h2>
          {days === null ? (
            <p className="hint">{L.countdownNeedDate}</p>
          ) : (
            <p className="count-big">
              {days > 0 ? <><strong>{days}</strong> {L.daysLeft}</> : days === 0 ? L.today : L.past}
            </p>
          )}
          <label className="field wide">
            <span>{L.noteLabel}</span>
            <input value={countdownNote} maxLength={200} placeholder="Es. Navetta alle 15:00 dal centro" onChange={(e) => setCountdownNote(e.target.value)} />
          </label>
        </section>

        <section className="planner-card" aria-labelledby="pl-notes">
          <h2 id="pl-notes">{L.notes}</h2>
          <textarea rows={8} value={notes} maxLength={4000} placeholder="Fornitori, scadenze, cose da ricordare…" onChange={(e) => setNotes(e.target.value)} aria-label={L.notesAria} />
          <div className="planner-save">
            <button type="button" className="btn solid small" onClick={save} disabled={saved === "saving"}>
              {saved === "saving" ? L.saving : L.saveNotes}
            </button>
            <span role="status" className="hint">{saved === "ok" ? L.saved : saved === "error" ? L.notSaved : ""}</span>
          </div>
        </section>
      </div>

      <section className="planner-card" aria-labelledby="pl-rsvp">
        <div className="planner-card-head">
          <h2 id="pl-rsvp">{L.replies}</h2>
          <a className="btn outline small" href={`/api/invitations/${manage.id}/rsvps?format=csv`}>{L.csv}</a>
        </div>
        {summary.rsvps.length === 0 ? (
          <p className="hint">{L.noReplies}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th scope="col">{L.received}</th>{questions.map((q) => <th scope="col" key={q.id}>{q.label}</th>)}</tr>
              </thead>
              <tbody>
                {summary.rsvps.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.createdAt).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })}</td>
                    {questions.map((q) => {
                      const a = r.answers[q.id];
                      return <td key={q.id}>{q.type === "yes-no" ? (a === true ? (q.yes ?? "Sì") : a === false ? (q.no ?? "No") : "–") : String(a ?? "–")}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="planner-card" aria-labelledby="pl-guests">
        <h2 id="pl-guests">{L.guestsInvited}</h2>
        {sent === 0 ? (
          <p className="hint">{L.noInvites}</p>
        ) : (
          <ul className="guest-list">
            {manage.guests.map((g) => (
              <li key={g.email}><span>{g.email}</span><small>{L.sentOn(new Date(g.sentAt).toLocaleDateString(lang === "en" ? "en-GB" : "it-IT"))}</small></li>
            ))}
          </ul>
        )}
      </section>

    </main>
  );
}
