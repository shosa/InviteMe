"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { Catalog, InviteConfig, RsvpQuestion } from "@inviteme/shared";
import { Bell, CalendarDays, Check, Clock, Eye, FileDown, Pencil, Search, Share2, StickyNote, Users } from "lucide-react";
import { CopyLink } from "../CopyLink";
import { ui, type Lang } from "@/lib/ui";

export type PlannerData = {
  manage: { id: string; slug: string; status: "draft" | "paid"; config: InviteConfig; guests: { email: string; sentAt: string }[]; planner: { notes: string; countdownNote: string }; catalog?: Catalog };
  summary: { total: number; attending: number; declined: number; guests: number; questions: RsvpQuestion[]; rsvps: { id: string; createdAt: string; answers: Record<string, string | number | boolean> }[] };
};

// Giorni che mancano alla data dell'evento (negativo se è passata).
function daysUntil(iso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const target = new Date(`${iso}T12:00:00`).getTime();
  const today = new Date(new Date().toDateString()).getTime();
  return Math.round((target - today) / 86_400_000);
}

// Sezione con intestazione colorata: stesso linguaggio della dashboard, angoli morbidi.
function Panel({ icon, title, action, children, id, className = "" }: { icon: ReactNode; title: string; action?: ReactNode; children: ReactNode; id: string; className?: string }) {
  return (
    <section className={`pl-panel ${className}`} aria-labelledby={id}>
      <header className="pl-panel-head">
        <span className="pl-bubble" aria-hidden="true">{icon}</span>
        <h2 id={id}>{title}</h2>
        {action && <div className="pl-panel-action">{action}</div>}
      </header>
      {children}
    </section>
  );
}

export function PlannerPanel({ data, lang = "it" }: { data: PlannerData; lang?: Lang }) {
  const { manage, summary } = data;
  const L = ui(lang).planner;
  const T = lang === "en"
    ? { quick: "Quick actions", share: "Share", view: "Open invitation", edit: "Edit", search: "Search name or answer", all: "All", yes: "Attending", no: "Not attending", noMatch: "No result for this search", progress: "Replies received", of: "of", guestsSearch: "Search guest", whatsapp: "WhatsApp", count: "Countdown", remind: "Reminder" }
    : { quick: "Azioni rapide", share: "Condividi", view: "Apri invito", edit: "Modifica", search: "Cerca nome o risposta", all: "Tutti", yes: "Presenti", no: "Assenti", noMatch: "Nessun risultato per questa ricerca", progress: "Risposte ricevute", of: "su", guestsSearch: "Cerca ospite", whatsapp: "WhatsApp", count: "Conto alla rovescia", remind: "Promemoria" };
  const title = String(manage.config.event.title ?? "Il tuo invito");
  const eventDate = String(manage.config.event.eventDate ?? "");
  const eventTime = String(manage.config.event.eventTime ?? "");
  const days = daysUntil(eventDate);
  const [notes, setNotes] = useState(manage.planner.notes ?? "");
  const [countdownNote, setCountdownNote] = useState(manage.planner.countdownNote ?? "");
  const [saved, setSaved] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [filter, setFilter] = useState<"all" | "yes" | "no">("all");
  const [query, setQuery] = useState("");
  const [guestQuery, setGuestQuery] = useState("");
  const sent = manage.guests.length;
  const pending = Math.max(0, sent - summary.total);
  const questions = useMemo(() => summary.questions, [summary.questions]);
  // La prima domanda sì/no dice chi viene: serve per i filtri Presenti / Assenti.
  const attendingQ = questions.find((q) => q.type === "yes-no");
  const attendingOf = (r: PlannerData["summary"]["rsvps"][number]) => (attendingQ ? r.answers[attendingQ.id] === true : null);
  const rows = useMemo(() => summary.rsvps.filter((r) => {
    if (filter === "yes" && attendingOf(r) !== true) return false;
    if (filter === "no" && attendingOf(r) !== false) return false;
    if (!query.trim()) return true;
    return Object.values(r.answers).some((a) => String(a).toLowerCase().includes(query.trim().toLowerCase()));
  }), [summary.rsvps, filter, query]); // eslint-disable-line react-hooks/exhaustive-deps
  const guests = manage.guests.filter((g) => g.email.toLowerCase().includes(guestQuery.trim().toLowerCase()));
  const shareHref = `/i/${manage.slug}`;
  const shareText = `${lang === "en" ? "You're invited! All the details here" : "Vi invitiamo! Trovate tutti i dettagli qui"}: ${typeof window === "undefined" ? shareHref : window.location.origin + shareHref}`;
  const replyPct = sent > 0 ? Math.min(100, Math.round((summary.total / sent) * 100)) : 0;
  const yesPct = summary.total > 0 ? Math.round((summary.attending / summary.total) * 100) : 0;

  async function save() {
    setSaved("saving");
    const res = await fetch(`/api/invitations/${manage.id}/planner`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notes, countdownNote }) });
    setSaved(res.ok ? "ok" : "error");
    setTimeout(() => setSaved("idle"), 2400);
  }

  return (
    <div className="pl">
      <div className="pl-quick" role="group" aria-label={T.quick}>
        <a className="pl-chip" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer"><Share2 size={16} aria-hidden="true" />{T.whatsapp}</a>
        <CopyLink path={shareHref} lang={lang} />
        <a className="pl-chip" href={shareHref} target="_blank" rel="noreferrer"><Eye size={16} aria-hidden="true" />{T.view}</a>
        <a className="pl-chip" href={`/editor/${manage.id}`}><Pencil size={16} aria-hidden="true" />{T.edit}</a>
      </div>

      <div className="pl-tiles" aria-label={L.kicker}>
        <div className="pl-tile pl-tile-a"><Users size={22} aria-hidden="true" /><span>{L.invited}</span><strong>{sent}</strong><small>{L.invitedSub}</small></div>
        <div className="pl-tile pl-tile-b"><Check size={22} aria-hidden="true" /><span>{L.replied}</span><strong>{summary.total}</strong><small>{L.repliedSub(pending)}</small></div>
        <div className="pl-tile pl-tile-c"><CalendarDays size={22} aria-hidden="true" /><span>{L.present}</span><strong>{summary.attending}</strong><small>{L.presentSub(summary.declined)}</small></div>
        <div className="pl-tile pl-tile-d"><Users size={22} aria-hidden="true" /><span>{L.people}</span><strong>{summary.guests}</strong><small>{L.peopleSub}</small></div>
      </div>

      <div className="pl-progress" aria-label={T.progress}>
        <div className="pl-progress-top"><span>{T.progress}</span><strong>{summary.total} {T.of} {sent}</strong></div>
        <div className="pl-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={replyPct}><span style={{ width: `${replyPct}%` }} /></div>
        <div className="pl-progress-top"><span>{L.present}</span><strong>{yesPct}%</strong></div>
        <div className="pl-bar pl-bar-yes" aria-hidden="true"><span style={{ width: `${yesPct}%` }} /></div>
      </div>

      <div className="pl-grid">
        <Panel id="pl-count" className="pl-count" icon={<Clock size={20} aria-hidden="true" />} title={T.count}>
          {days === null ? (
            <p className="hint">{L.countdownNeedDate}</p>
          ) : (
            <p className="pl-big">{days > 0 ? <><strong>{days}</strong> {L.daysLeft}</> : days === 0 ? L.today : L.past}</p>
          )}
          <p className="hint">{eventDate ? `${eventDate}${eventTime ? ` · ${eventTime}` : ""}` : (lang === "en" ? "Date to be set" : "Data da impostare")}</p>
          <label className="pl-field">
            <span>{L.noteLabel}</span>
            <input value={countdownNote} maxLength={200} placeholder={lang === "en" ? "e.g. Shuttle at 3pm from the centre" : "Es. Navetta alle 15:00 dal centro"} onChange={(e) => setCountdownNote(e.target.value)} />
          </label>
        </Panel>

        <Panel id="pl-notes" icon={<StickyNote size={20} aria-hidden="true" />} title={L.notes}>
          <textarea rows={7} value={notes} maxLength={4000} placeholder={lang === "en" ? "Suppliers, deadlines, things to remember…" : "Fornitori, scadenze, cose da ricordare…"} onChange={(e) => setNotes(e.target.value)} aria-label={L.notesAria} />
          <div className="pl-save">
            <button type="button" className="pl-btn" onClick={save} disabled={saved === "saving"}>{saved === "saving" ? L.saving : L.saveNotes}</button>
            <span role="status" className="hint">{saved === "ok" ? L.saved : saved === "error" ? L.notSaved : ""}</span>
          </div>
        </Panel>
      </div>

      <Panel id="pl-rsvp" icon={<Check size={20} aria-hidden="true" />} title={L.replies} action={<a className="pl-chip" href={`/api/invitations/${manage.id}/rsvps?format=csv`}><FileDown size={16} aria-hidden="true" />{L.csv}</a>}>
        {summary.rsvps.length === 0 ? (
          <p className="hint">{L.noReplies}</p>
        ) : (
          <>
            <div className="pl-tools">
              <div className="pl-seg" role="group" aria-label={T.all}>
                {(["all", "yes", "no"] as const).map((f) => (
                  <button key={f} type="button" className={filter === f ? "is-on" : ""} aria-pressed={filter === f} onClick={() => setFilter(f)} disabled={f !== "all" && !attendingQ}>
                    {f === "all" ? T.all : f === "yes" ? T.yes : T.no}
                  </button>
                ))}
              </div>
              <label className="pl-search"><Search size={16} aria-hidden="true" /><input type="search" value={query} placeholder={T.search} onChange={(e) => setQuery(e.target.value)} /></label>
            </div>
            {rows.length === 0 ? (
              <p className="hint">{T.noMatch}</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th scope="col">{L.received}</th>{questions.map((q) => <th scope="col" key={q.id}>{q.label}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td>{new Date(r.createdAt).toLocaleString(lang === "en" ? "en-GB" : "it-IT", { dateStyle: "short", timeStyle: "short" })}</td>
                        {questions.map((q) => {
                          const a = r.answers[q.id];
                          if (q.type === "yes-no") return <td key={q.id}><span className={`pl-answer ${a === true ? "is-yes" : a === false ? "is-no" : ""}`}>{a === true ? (q.yes ?? "Sì") : a === false ? (q.no ?? "No") : "–"}</span></td>;
                          return <td key={q.id}>{String(a ?? "–")}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Panel>

      <Panel id="pl-guests" icon={<Bell size={20} aria-hidden="true" />} title={L.guestsInvited}>
        {sent === 0 ? (
          <p className="hint">{L.noInvites}</p>
        ) : (
          <>
            <label className="pl-search"><Search size={16} aria-hidden="true" /><input type="search" value={guestQuery} placeholder={T.guestsSearch} onChange={(e) => setGuestQuery(e.target.value)} /></label>
            <ul className="pl-guests">
              {guests.map((g) => (
                <li key={g.email}>
                  <span className="pl-avatar" aria-hidden="true">{g.email.charAt(0).toUpperCase()}</span>
                  <span className="pl-guest-mail">{g.email}</span>
                  <small>{L.sentOn(new Date(g.sentAt).toLocaleDateString(lang === "en" ? "en-GB" : "it-IT"))}</small>
                </li>
              ))}
            </ul>
            {guests.length === 0 && <p className="hint">{T.noMatch}</p>}
          </>
        )}
      </Panel>
    </div>
  );
}
