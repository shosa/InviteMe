import { pool } from "./db";

// Posta transazionale. Con RESEND_API_KEY invia davvero; senza, salva nella tabella outbox
// (visibile in sviluppo su /api/dev/outbox), così il flusso è verificabile senza credenziali.
export const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export type MailMessage = { to: string; subject: string; html: string; text: string };

export async function sendMail(msg: MailMessage): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (key) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.MAIL_FROM ?? "InviteMe <onboarding@resend.dev>",
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      }),
    });
    if (!res.ok) throw new Error(`Invio email non riuscito (${res.status})`);
    return;
  }
  await pool.query("INSERT INTO outbox (to_address, subject, html, text) VALUES ($1, $2, $3, $4)", [
    msg.to,
    msg.subject,
    msg.html,
    msg.text,
  ]);
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

function shell(title: string, body: string): string {
  return `<!doctype html><html lang="it"><body style="margin:0;background:#f7f3ec;font-family:Georgia,serif;color:#1d1b18">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table role="presentation" width="560" style="max-width:560px;background:#ffffff;border-radius:20px;padding:40px 36px">
<tr><td><p style="font:600 12px Arial,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#0a4560;margin:0 0 18px">InviteMe</p>
<h1 style="font:400 26px Georgia,serif;margin:0 0 16px">${title}</h1>${body}</td></tr></table>
<p style="font:12px Arial,sans-serif;color:#8a8478;margin:16px 0 0">Ricevi questa email perché usi InviteMe.</p>
</td></tr></table></body></html>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:28px 0"><a href="${href}" style="display:inline-block;background:#0a4560;color:#ffffff;text-decoration:none;padding:14px 26px;border-radius:999px;font:600 15px Arial,sans-serif">${label}</a></p>`;

export function inviteEmail(p: { to: string; hosts: string; title: string; slug: string; personal?: string }): MailMessage {
  const link = `${appUrl()}/i/${p.slug}`;
  return {
    to: p.to,
    subject: `Invito: ${p.title}`,
    html: shell(
      `${esc(p.hosts)} vi invitano`,
      `<p style="font:16px/1.6 Arial,sans-serif;color:#4a4640">${p.personal ? esc(p.personal) : `Trovate qui tutti i dettagli di <strong>${esc(p.title)}</strong>, il programma e il modulo per confermare la presenza.`}</p>${button(link, "Apri l'invito")}<p style="font:13px Arial,sans-serif;color:#8a8478">Oppure copia questo link: ${link}</p>`,
    ),
    text: `${p.hosts} vi invitano. Apri l'invito: ${link}`,
  };
}

export function rsvpNoticeEmail(p: { to: string; title: string; attending: boolean; invitationId: string }): MailMessage {
  const link = `${appUrl()}/editor/${p.invitationId}`;
  const verdict = p.attending ? "parteciperà" : "non potrà partecipare";
  return {
    to: p.to,
    subject: `Nuova risposta per ${p.title}`,
    html: shell("Nuova conferma", `<p style="font:16px/1.6 Arial,sans-serif;color:#4a4640">Un ospite ${verdict} a <strong>${esc(p.title)}</strong>.</p>${button(link, "Vedi le risposte")}`),
    text: `Nuova risposta per ${p.title}: un ospite ${verdict}. Vedi le risposte in ${link}`,
  };
}

export function orderEmail(p: { to: string; title: string; amount: string; slug: string }): MailMessage {
  const link = `${appUrl()}/i/${p.slug}`;
  return {
    to: p.to,
    subject: `Pagamento ricevuto: ${p.title}`,
    html: shell(
      "Grazie, il tuo invito è attivo",
      `<p style="font:16px/1.6 Arial,sans-serif;color:#4a4640">Abbiamo ricevuto il pagamento di <strong>${esc(p.amount)}</strong>. Il tuo link è pronto da condividere con gli ospiti.</p>${button(link, "Apri l'invito")}`,
    ),
    text: `Pagamento di ${p.amount} ricevuto. Il tuo invito: ${link}`,
  };
}

export function resetEmail(p: { to: string; token: string }): MailMessage {
  const link = `${appUrl()}/reset?token=${p.token}`;
  return {
    to: p.to,
    subject: "Reimposta la password di InviteMe",
    html: shell(
      "Reimposta la password",
      `<p style="font:16px/1.6 Arial,sans-serif;color:#4a4640">Hai chiesto di reimpostare la password. Il link vale 60 minuti.</p>${button(link, "Scegli una nuova password")}<p style="font:13px Arial,sans-serif;color:#8a8478">Se non sei stato tu, ignora questa email.</p>`,
    ),
    text: `Reimposta la password: ${link} (valido 60 minuti)`,
  };
}
