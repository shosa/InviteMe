import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import staticFiles from "@fastify/static";
import {
  EVENT_TYPES,
  activeFeatures,
  defaultConfig,
  formatPrice,
  getAddon,
  getModel,
  getStyle,
  hasRsvp,
  makeSlug,
  sanitizeConfig,
  totalCents,
  type AddonKey,
  type Catalog,
  type InviteConfig,
  type StyleDef,
  validateTheme,
} from "@inviteme/shared";
import { pool, migrate, track } from "./db";
import { BUILTIN_IDS, mergeThemes } from "./catalog";
import { loadCatalog, loadFullCatalog, saveCatalog } from "./catalog";
import {
  SESSION_COOKIE,
  adminAllowed,
  consumeResetToken,
  createResetToken,
  currentUser,
  endSession,
  hashPassword,
  startSession,
  verifyPassword,
  type SessionUser,
} from "./auth";
import { appUrl, inviteEmail, orderEmail, resetEmail, rsvpNoticeEmail, sendMail, type MailMessage } from "./mail";
import { registerGoogle, googleEnabled } from "./google";
import { createCheckout, invitationIdFromOrder, localCheckoutAllowed, shopifyConfigured, verifyShopifyWebhook } from "./shopify";

const MEDIA_DIR = process.env.MEDIA_DIR ?? path.join(process.cwd(), "data", "media");
const isProd = process.env.NODE_ENV === "production";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Row = Record<string, any>;

export async function buildApp() {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? "info" }, bodyLimit: 12 * 1024 * 1024 });
  await app.register(cookie);
  await app.register(multipart, { limits: { fileSize: 15 * 1024 * 1024, files: 1 } });
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
  await app.register(staticFiles, { root: MEDIA_DIR, prefix: "/api/media/", decorateReply: false });

  // Il webhook Shopify va verificato sul corpo grezzo: lo conserviamo accanto al JSON già parsato.
  app.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
    (req as FastifyRequest & { rawBody?: string }).rawBody = body as string;
    try {
      done(null, body && (body as string).length ? JSON.parse(body as string) : {});
    } catch (e) {
      done(e as Error, undefined);
    }
  });

  const requireUser = async (req: FastifyRequest, reply: FastifyReply): Promise<SessionUser | null> => {
    const user = await currentUser(req);
    if (!user) reply.code(401).send({ error: "Accedi per continuare" });
    return user;
  };
  const requireAdmin = async (req: FastifyRequest, reply: FastifyReply): Promise<boolean> => {
    const user = await currentUser(req);
    if (user?.role === "admin" || adminAllowed(req)) return true;
    reply.code(403).send({ error: "Area riservata" });
    return false;
  };

  // Carica un invito verificando che appartenga all'utente. Non rivela l'esistenza di inviti altrui.
  async function ownedInvitation(id: string, userId: string): Promise<Row | null> {
    if (!UUID.test(id)) return null;
    const { rows } = await pool.query("SELECT * FROM invitations WHERE id = $1 AND user_id = $2", [id, userId]);
    return rows[0] ?? null;
  }

  // ───────────── Health & catalogo pubblico ─────────────
  app.get("/api/health", async () => ({ ok: true }));

  app.get("/api/catalog", async () => {
    const c = await loadCatalog();
    return { ...c, eventTypes: EVENT_TYPES, shopify: shopifyConfigured(), google: googleEnabled() };
  });

  // ───────────── Autenticazione ─────────────
  app.post("/api/auth/register", async (req, reply) => {
    const b = (req.body ?? {}) as { email?: string; password?: string; name?: string };
    const email = String(b.email ?? "").trim().toLowerCase();
    const name = String(b.name ?? "").trim().slice(0, 80);
    const password = String(b.password ?? "");
    if (!EMAIL.test(email)) return reply.code(400).send({ error: "Inserisci un'email valida" });
    if (password.length < 8) return reply.code(400).send({ error: "La password deve avere almeno 8 caratteri" });
    if (!name) return reply.code(400).send({ error: "Inserisci il tuo nome" });

    const role = process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL.toLowerCase() ? "admin" : "user";
    try {
      const { rows } = await pool.query(
        "INSERT INTO users (id, email, name, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role",
        [randomUUID(), email, name, await hashPassword(password), role],
      );
      await startSession(reply, rows[0].id);
      return reply.code(201).send(rows[0]);
    } catch (e) {
      if ((e as { code?: string }).code === "23505") return reply.code(409).send({ error: "Esiste già un account con questa email" });
      throw e;
    }
  });

  app.post("/api/auth/login", async (req, reply) => {
    const b = (req.body ?? {}) as { email?: string; password?: string };
    const email = String(b.email ?? "").trim().toLowerCase();
    const { rows } = await pool.query("SELECT id, email, name, role, password_hash FROM users WHERE email = $1", [email]);
    const user = rows[0];
    // Stessa risposta per email sconosciuta e password errata: nessun elenco di account.
    const ok = !!user && !!user.password_hash && (await verifyPassword(String(b.password ?? ""), user.password_hash));
    if (!ok) return reply.code(401).send({ error: "Email o password non corretti" });
    await startSession(reply, user.id);
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  });

  app.get("/api/auth/me", async (req) => {
    const user = await currentUser(req);
    return { user };
  });

  app.delete("/api/auth/me", async (req, reply) => {
    await endSession(req, reply);
    return { ok: true };
  });

  app.post("/api/auth/forgot", async (req) => {
    const email = String(((req.body ?? {}) as { email?: string }).email ?? "").trim().toLowerCase();
    const { rows } = await pool.query("SELECT id, email FROM users WHERE email = $1", [email]);
    if (rows[0]) {
      const token = await createResetToken(rows[0].id);
      await sendMail(resetEmail({ to: rows[0].email, token }));
    }
    return { ok: true }; // risposta identica in ogni caso
  });

  app.post("/api/auth/reset", async (req, reply) => {
    const b = (req.body ?? {}) as { token?: string; password?: string };
    const password = String(b.password ?? "");
    if (password.length < 8) return reply.code(400).send({ error: "La password deve avere almeno 8 caratteri" });
    if (!b.token) return reply.code(400).send({ error: "Link non valido" });
    const userId = await consumeResetToken(b.token);
    if (!userId) return reply.code(400).send({ error: "Il link è scaduto o già usato. Richiedine uno nuovo." });
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [await hashPassword(password), userId]);
    await pool.query("DELETE FROM sessions WHERE user_id = $1", [userId]);
    await startSession(reply, userId);
    return { ok: true };
  });

  // ───────────── Account e inviti del proprietario ─────────────
  app.get("/api/account/invitations", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const c = await loadFullCatalog();
    const { rows } = await pool.query(
      `SELECT i.id, i.slug, i.status, i.config, i.views, i.guests, i.created_at,
              (SELECT count(*)::int FROM rsvps r WHERE r.invitation_id = i.id) AS rsvps
       FROM invitations i WHERE i.user_id = $1 ORDER BY i.created_at DESC`,
      [user.id],
    );
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      status: r.status,
      title: r.config.title,
      eventDate: r.config.eventDate,
      model: getModel(c, r.config.model)?.name ?? r.config.model,
      views: r.views,
      guests: (r.guests ?? []).length,
      rsvps: r.rsvps,
    }));
  });

  app.post("/api/invitations", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const c = await loadCatalog();
    const b = (req.body ?? {}) as { model?: string; eventType?: string; styleId?: string };
    const model = getModel(c, String(b.model ?? ""));
    if (!model) return reply.code(400).send({ error: "Modello non disponibile" });
    const eventType = EVENT_TYPES.find((e) => e.id === b.eventType)?.id ?? "wedding";
    const config = defaultConfig(c, model.id, eventType);
    config.styleId = getStyle(c, String(b.styleId ?? "")).id;
    const id = randomUUID();
    const slug = makeSlug(config.title);
    await pool.query("INSERT INTO invitations (id, slug, user_id, config) VALUES ($1, $2, $3, $4)", [id, slug, user.id, JSON.stringify(config)]);
    await track("invitation_created", id);
    return reply.code(201).send({ id, slug });
  });

  app.get<{ Params: { id: string } }>("/api/invitations/:id/manage", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const inv = await ownedInvitation(req.params.id, user.id);
    if (!inv) return reply.code(404).send({ error: "Invito non trovato" });
    const c = await loadFullCatalog();
    return {
      id: inv.id,
      slug: inv.slug,
      status: inv.status,
      config: inv.config as InviteConfig,
      guests: inv.guests,
      views: inv.views,
      catalog: c,
      hasRsvp: hasRsvp(c, inv.config),
    };
  });

  app.put<{ Params: { id: string } }>("/api/invitations/:id", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const inv = await ownedInvitation(req.params.id, user.id);
    if (!inv) return reply.code(404).send({ error: "Invito non trovato" });
    if (inv.status === "paid") return reply.code(409).send({ error: "Invito già pagato: non è più modificabile" });
    const config = sanitizeConfig(await loadCatalog(), req.body);
    if (!config) return reply.code(400).send({ error: "Configurazione non valida" });
    await pool.query("UPDATE invitations SET config = $1 WHERE id = $2", [JSON.stringify(config), inv.id]);
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>("/api/invitations/:id/guests", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const inv = await ownedInvitation(req.params.id, user.id);
    if (!inv) return reply.code(404).send({ error: "Invito non trovato" });
    if (inv.status !== "paid") return reply.code(409).send({ error: "Paga l'invito prima di inviarlo agli ospiti" });

    const b = (req.body ?? {}) as { emails?: unknown; message?: unknown };
    const list = (Array.isArray(b.emails) ? b.emails : [])
      .map((e) => String(e).trim().toLowerCase())
      .filter((e) => EMAIL.test(e));
    const unique = [...new Set(list)].slice(0, 100);
    if (unique.length === 0) return reply.code(400).send({ error: "Nessun indirizzo email valido" });
    const personal = typeof b.message === "string" ? b.message.slice(0, 500) : undefined;

    const sent: string[] = [];
    const failed: string[] = [];
    for (const to of unique) {
      try {
        await sendMail(inviteEmail({ to, hosts: inv.config.hosts, title: inv.config.title, slug: inv.slug, personal }));
        sent.push(to);
      } catch {
        failed.push(to);
      }
    }
    const now = new Date().toISOString();
    const guests = [...(inv.guests as Row[])];
    for (const email of sent) if (!guests.some((g) => g.email === email)) guests.push({ email, sentAt: now });
    await pool.query("UPDATE invitations SET guests = $1 WHERE id = $2", [JSON.stringify(guests), inv.id]);
    return { sent: sent.length, failed };
  });

  app.get<{ Params: { id: string }; Querystring: { format?: string } }>("/api/invitations/:id/rsvps", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const inv = await ownedInvitation(req.params.id, user.id);
    if (!inv) return reply.code(404).send({ error: "Invito non trovato" });
    const { rows } = await pool.query("SELECT id, answers, created_at FROM rsvps WHERE invitation_id = $1 ORDER BY created_at DESC", [inv.id]);
    const questions = (inv.config.rsvpQuestions ?? []) as Row[];

    if (req.query.format === "csv") {
      const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const header = ["Ricevuta il", ...questions.map((q) => q.label)];
      const lines = rows.map((r) =>
        [
          new Date(r.created_at).toLocaleString("it-IT"),
          ...questions.map((q) => {
            const a = r.answers[q.id];
            return q.type === "yes-no" ? (a === true ? "Sì" : a === false ? "No" : "") : a;
          }),
        ].map(esc).join(","),
      );
      reply.header("Content-Type", "text/csv; charset=utf-8");
      reply.header("Content-Disposition", `attachment; filename="rsvp-${inv.slug}.csv"`);
      return "﻿" + [header.map(esc).join(","), ...lines].join("\n");
    }

    const yes = rows.filter((r) => r.answers.attending === true);
    return {
      total: rows.length,
      attending: yes.length,
      declined: rows.filter((r) => r.answers.attending === false).length,
      guests: yes.reduce((s, r) => s + (Number(r.answers.guests) || 1), 0),
      questions,
      rsvps: rows.map((r) => ({ id: r.id, createdAt: r.created_at, answers: r.answers })),
    };
  });

  // ───────────── Pubblico: invito, conferme ─────────────
  app.get<{ Params: { slug: string } }>("/api/public/invitations/:slug", async (req, reply) => {
    const { rows } = await pool.query("SELECT * FROM invitations WHERE slug = $1 AND status = 'paid'", [req.params.slug]);
    const inv = rows[0];
    if (!inv) return reply.code(404).send({ error: "Invito non trovato" });
    await pool.query("UPDATE invitations SET views = views + 1 WHERE id = $1", [inv.id]);
    await track("invitation_viewed", inv.id);
    const c = await loadCatalog();
    const config = inv.config as InviteConfig;
    const track_ = c.music.find((t) => t.id === config.musicTrackId);
    return {
      id: inv.id,
      slug: inv.slug,
      config,
      style: getStyle(c, config.styleId),
      hasRsvp: hasRsvp(c, config),
      musicSrc: track_?.url ?? config.musicUrl ?? c.music.find((t) => t.id === getStyle(c, config.styleId).music?.defaultTrackId)?.url ?? getStyle(c, config.styleId).music?.file ?? null,
      features: [...activeFeatures(c, config.model, config.addons)],
    };
  });

  app.post("/api/rsvp", async (req, reply) => {
    const b = (req.body ?? {}) as { slug?: string; answers?: Record<string, unknown> };
    if (!b.slug || !b.answers || typeof b.answers !== "object") return reply.code(400).send({ error: "Dati mancanti" });
    const { rows } = await pool.query(
      `SELECT i.id, i.config, u.email AS owner_email FROM invitations i JOIN users u ON u.id = i.user_id
       WHERE i.slug = $1 AND i.status = 'paid'`,
      [b.slug],
    );
    const inv = rows[0];
    if (!inv) return reply.code(404).send({ error: "Invito non trovato" });
    const c = await loadCatalog();
    if (!hasRsvp(c, inv.config)) return reply.code(400).send({ error: "Questo invito non prevede conferma di presenza" });

    // Solo le domande configurate, con valori del tipo giusto.
    const questions = (inv.config.rsvpQuestions as Row[]) ?? [];
    const answers: Record<string, string | number | boolean> = {};
    for (const q of questions) {
      const v = b.answers[q.id];
      if (q.type === "yes-no" && typeof v === "boolean") answers[q.id] = v;
      else if (q.type === "number" && typeof v === "number" && v >= 0 && v <= 50) answers[q.id] = Math.round(v);
      else if (q.type === "text" && typeof v === "string") answers[q.id] = v.slice(0, 500);
      else if (q.type === "choice" && typeof v === "string" && (q.options ?? []).includes(v)) answers[q.id] = v;
    }

    await pool.query("INSERT INTO rsvps (id, invitation_id, answers) VALUES ($1, $2, $3)", [randomUUID(), inv.id, JSON.stringify(answers)]);
    await track("rsvp_submitted", inv.id);
    // Notifica al proprietario: un errore di posta non blocca la risposta dell'ospite.
    await sendMail(
      rsvpNoticeEmail({ to: inv.owner_email, title: inv.config.title, attending: answers.attending === true, invitationId: inv.id }),
    ).catch((e) => req.log.warn({ err: e }, "notifica RSVP non inviata"));
    return reply.code(201).send({ ok: true });
  });

  // ───────────── Pagamento ─────────────
  app.post("/api/checkout", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const b = (req.body ?? {}) as { invitationId?: string };
    const inv = b.invitationId && UUID.test(b.invitationId) ? await ownedInvitation(b.invitationId, user.id) : null;
    if (!inv) return reply.code(404).send({ error: "Invito non trovato" });
    if (inv.status === "paid") return reply.code(409).send({ error: "Invito già pagato" });
    if (!shopifyConfigured() && !localCheckoutAllowed()) {
      return reply.code(503).send({ error: "I pagamenti non sono ancora attivi su questo server" });
    }
    const c = await loadCatalog();
    const selected = [...activeFeatures(c, inv.config.model, inv.config.addons)].filter((k) => inv.config.addons.includes(k));
    const amount = totalCents(c, inv.config.model, inv.config.addons);
    try {
      const checkout = await createCheckout({
        invitationId: inv.id,
        slug: inv.slug,
        addons: selected,
        totalCents: amount,
        origin: appUrl(),
      });
      await pool.query(
        "INSERT INTO orders (id, invitation_id, amount_cents, currency, source, status, checkout_url) VALUES ($1, $2, $3, 'EUR', $4, 'pending', $5)",
        [randomUUID(), inv.id, amount, checkout.source, checkout.checkoutUrl],
      );
      await track("checkout_started", inv.id);
      return { checkoutUrl: checkout.checkoutUrl };
    } catch (e) {
      return reply.code(502).send({ error: e instanceof Error ? e.message : "Errore checkout" });
    }
  });

  // Solo checkout di prova: disattivato con Shopify e in produzione (salvo ALLOW_LOCAL_CHECKOUT=true).
  app.post("/api/checkout/complete", async (req, reply) => {
    if (shopifyConfigured() || !localCheckoutAllowed()) return reply.code(403).send({ error: "Checkout di prova non disponibile" });
    const user = await requireUser(req, reply);
    if (!user) return;
    const b = (req.body ?? {}) as { invitationId?: string };
    const inv = b.invitationId && UUID.test(b.invitationId) ? await ownedInvitation(b.invitationId, user.id) : null;
    if (!inv) return reply.code(404).send({ error: "Invito non trovato" });
    const c = await loadCatalog();
    await markPaid(inv.id, `TEST-${Date.now()}`, totalCents(c, inv.config.model, inv.config.addons), "local");
    return { ok: true };
  });

  async function markPaid(invitationId: string, orderRef: string, amountCents: number, source: "shopify" | "local") {
    await pool.query("UPDATE invitations SET status = 'paid', order_ref = $2 WHERE id = $1", [invitationId, orderRef]);
    await pool.query(
      `UPDATE orders SET status = 'paid' WHERE invitation_id = $1 AND status = 'pending'`,
      [invitationId],
    );
    await pool.query(
      "INSERT INTO orders (id, invitation_id, amount_cents, currency, source, status) SELECT $1, $2, $3, 'EUR', $4, 'paid' WHERE NOT EXISTS (SELECT 1 FROM orders WHERE invitation_id = $2 AND status = 'paid')",
      [randomUUID(), invitationId, amountCents, source],
    );
    await track("order_paid", invitationId);
    const { rows } = await pool.query(
      `SELECT i.slug, i.config, u.email FROM invitations i JOIN users u ON u.id = i.user_id WHERE i.id = $1`,
      [invitationId],
    );
    if (rows[0]) {
      await sendMail(
        orderEmail({ to: rows[0].email, title: rows[0].config.title, amount: formatPrice(amountCents), slug: rows[0].slug }),
      ).catch((e) => app.log.warn({ err: e }, "conferma d'ordine non inviata"));
    }
  }

  // Webhook Shopify orders/paid: firma verificata sul corpo grezzo, poi attivazione dell'invito.
  app.post("/api/webhooks/shopify", async (req, reply) => {
    const raw = (req as FastifyRequest & { rawBody?: string }).rawBody ?? "";
    if (!verifyShopifyWebhook(raw, req.headers["x-shopify-hmac-sha256"] as string | undefined)) {
      return reply.code(401).send({ error: "Firma non valida" });
    }
    if (req.headers["x-shopify-topic"] !== "orders/paid") return { ok: true, ignored: true };
    const order = req.body as {
      id: number;
      name: string;
      total_price: string;
      currency: string;
      note_attributes?: { name: string; value: string }[];
      line_items?: { properties?: { name: string; value: string }[] }[];
    };
    const invitationId = invitationIdFromOrder(order);
    if (invitationId && UUID.test(invitationId)) {
      const { rows } = await pool.query("SELECT id FROM invitations WHERE id = $1", [invitationId]);
      if (rows[0]) await markPaid(invitationId, order.name, Math.round(Number(order.total_price) * 100), "shopify");
    }
    await pool.query(
      `INSERT INTO orders (id, invitation_id, amount_cents, currency, source, status) VALUES ($1, $2, $3, $4, 'shopify', 'paid')
       ON CONFLICT (id) DO NOTHING`,
      [String(order.id), invitationId && UUID.test(invitationId) ? invitationId : null, Math.round(Number(order.total_price) * 100), order.currency],
    );
    return { ok: true };
  });

  // ───────────── Admin: metriche, catalogo, musica, ordini, utenti ─────────────
  app.get("/api/admin/metrics", async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;
    const { rows } = await pool.query(`
      SELECT
        (SELECT count(*)::int FROM users) AS users,
        (SELECT count(*)::int FROM invitations) AS invitations,
        (SELECT count(*)::int FROM invitations WHERE status = 'paid') AS paid,
        (SELECT coalesce(sum(amount_cents), 0)::int FROM orders WHERE status = 'paid') AS revenue_cents,
        (SELECT count(*)::int FROM orders WHERE status = 'paid') AS orders,
        (SELECT coalesce(sum(views), 0)::int FROM invitations) AS views,
        (SELECT count(*)::int FROM rsvps) AS rsvps,
        (SELECT coalesce(sum(jsonb_array_length(guests)), 0)::int FROM invitations) AS guest_emails,
        (SELECT count(*)::int FROM events WHERE type = 'checkout_started') AS checkouts`);
    const byModel = await pool.query("SELECT config->>'model' AS model, count(*)::int AS n FROM invitations GROUP BY 1");
    const m = rows[0];
    return {
      users: m.users,
      invitations: m.invitations,
      drafts: m.invitations - m.paid,
      paid: m.paid,
      orders: m.orders,
      revenueCents: m.revenue_cents,
      views: m.views,
      rsvps: m.rsvps,
      guestEmailsSent: m.guest_emails,
      checkoutsStarted: m.checkouts,
      conversionRate: m.invitations ? m.paid / m.invitations : 0,
      byModel: Object.fromEntries(byModel.rows.map((r) => [r.model, r.n])),
    };
  });

  app.get("/api/admin/catalog", async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;
    return loadFullCatalog();
  });

  // Salva modelli, funzioni e stili. Ogni valore viene validato: l'admin non può inserire HTML o prezzi negativi.
  app.put("/api/admin/catalog", async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;
    const b = (req.body ?? {}) as { models?: Row[]; addons?: Row[]; styles?: Row[] };
    const addonKeys = ["rsvp", "program", "map", "music", "countdown", "gallery", "express"];
    const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
    const hex = (v: unknown, fb: string) => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fb);

    const addons = (b.addons ?? []).filter((a) => addonKeys.includes(a.key)).map((a) => ({
      key: a.key,
      label: text(a.label, 80),
      description: text(a.description, 160),
      cents: Math.round(Math.max(0, Math.min(100_000_00, Number(a.cents) || 0))),
      enabled: !!a.enabled,
    }));
    const keySet = new Set(addons.map((a) => a.key));
    // I temi: preimpostati dal codice, caricati dall'admin validati uno per uno.
    const styles = mergeThemes(Array.isArray(b.styles) ? (b.styles as StyleDef[]).slice(0, 40) : undefined);
    const models = (b.models ?? []).slice(0, 12).map((m, i) => ({
      id: text(m.id, 40).replace(/[^a-z0-9-]/gi, "-").toLowerCase() || `modello-${i}`,
      name: text(m.name, 80),
      tagline: text(m.tagline, 120),
      description: text(m.description, 400),
      priceCents: Math.round(Math.max(0, Math.min(100_000_00, Number(m.priceCents) || 0))),
      included: (Array.isArray(m.included) ? m.included : []).filter((k: string) => keySet.has(k)),
      options: (Array.isArray(m.options) ? m.options : []).filter((k: string) => keySet.has(k) && !(m.included ?? []).includes(k)),
      enabled: !!m.enabled,
      sort: Number.isFinite(Number(m.sort)) ? Number(m.sort) : i,
    }));
    if (models.length === 0 || styles.length === 0) return reply.code(400).send({ error: "Serve almeno un modello e uno stile" });
    await saveCatalog({ models, addons, styles });
    return { ok: true };
  });

  // Carica un tema: un manifest JSON validato (vedi docs/THEMES.md). Sostituisce un tema caricato con lo stesso id.
  app.post("/api/admin/themes", async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;
    const r = validateTheme(req.body);
    if (!r.theme) return reply.code(400).send({ error: "Tema non valido", errors: r.errors });
    if (BUILTIN_IDS.has(r.theme.id)) return reply.code(409).send({ error: "Un tema preimpostato non si sostituisce: scegli un altro id" });
    const c = await loadFullCatalog();
    const others = c.styles.filter((s) => s.id !== r.theme!.id);
    await saveCatalog({ models: c.models, addons: c.addons, styles: [...others, r.theme] as StyleDef[] });
    return reply.code(201).send({ id: r.theme.id, name: r.theme.name });
  });

  // Attiva o disattiva un tema (anche preimpostato).
  app.patch<{ Params: { id: string } }>("/api/admin/themes/:id", async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;
    const c = await loadFullCatalog();
    const found = c.styles.find((s) => s.id === req.params.id);
    if (!found) return reply.code(404).send({ error: "Tema non trovato" });
    const enabled = (req.body as { enabled?: boolean })?.enabled === true;
    const styles = c.styles.map((s) => (s.id === found.id ? { ...s, enabled } : s));
    if (!styles.some((s) => s.enabled)) return reply.code(400).send({ error: "Serve almeno un tema attivo" });
    await saveCatalog({ models: c.models, addons: c.addons, styles });
    return { ok: true };
  });

  // Elimina un tema caricato. I preimpostati non si eliminano, solo si disattivano.
  app.delete<{ Params: { id: string } }>("/api/admin/themes/:id", async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;
    if (BUILTIN_IDS.has(req.params.id)) return reply.code(409).send({ error: "I temi preimpostati si disattivano, non si eliminano" });
    const c = await loadFullCatalog();
    await saveCatalog({ models: c.models, addons: c.addons, styles: c.styles.filter((s) => s.id !== req.params.id) });
    return { ok: true };
  });

  app.get("/api/admin/music", async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;
    const { rows } = await pool.query("SELECT id, title, artist, url, license, enabled, created_at FROM music_tracks ORDER BY created_at DESC");
    return rows;
  });

  // Carica un brano (MP3, M4A, OGG) nella libreria. Serve la conferma dei diritti: è una responsabilità dell'admin.
  app.post("/api/admin/music", async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;
    const file = await req.file();
    if (!file) return reply.code(400).send({ error: "Nessun file ricevuto" });
    const allowed: Record<string, string> = { "audio/mpeg": ".mp3", "audio/mp4": ".m4a", "audio/x-m4a": ".m4a", "audio/ogg": ".ogg" };
    const ext = allowed[file.mimetype];
    if (!ext) return reply.code(400).send({ error: "Formato non supportato: usa MP3, M4A o OGG" });
    const fields = file.fields as Record<string, { value?: string } | undefined>;
    const title = String(fields.title?.value ?? file.filename).slice(0, 120).trim();
    const artist = String(fields.artist?.value ?? "").slice(0, 120);
    const license = String(fields.license?.value ?? "").slice(0, 300);
    if (fields.rights?.value !== "true") return reply.code(400).send({ error: "Conferma di avere i diritti del brano" });
    if (!title) return reply.code(400).send({ error: "Inserisci il titolo" });

    const id = randomUUID();
    const name = `${id}${ext}`;
    const buffer = await file.toBuffer();
    if (file.file.truncated) return reply.code(413).send({ error: "File troppo grande (massimo 15 MB)" });
    fs.writeFileSync(path.join(MEDIA_DIR, name), buffer);
    await pool.query("INSERT INTO music_tracks (id, title, artist, url, license) VALUES ($1, $2, $3, $4, $5)", [
      id,
      title,
      artist,
      `/api/media/${name}`,
      license,
    ]);
    return reply.code(201).send({ id, title });
  });

  app.post<{ Params: { id: string } }>("/api/admin/music/:id", async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;
    if (!UUID.test(req.params.id)) return reply.code(404).send({ error: "Brano non trovato" });
    const b = (req.body ?? {}) as { title?: string; artist?: string; license?: string; enabled?: boolean };
    await pool.query(
      `UPDATE music_tracks SET title = coalesce($2, title), artist = coalesce($3, artist), license = coalesce($4, license),
       enabled = coalesce($5, enabled) WHERE id = $1`,
      [req.params.id, b.title?.slice(0, 120) ?? null, b.artist?.slice(0, 120) ?? null, b.license?.slice(0, 300) ?? null, typeof b.enabled === "boolean" ? b.enabled : null],
    );
    return { ok: true };
  });

  app.delete<{ Params: { id: string } }>("/api/admin/music/:id", async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;
    if (!UUID.test(req.params.id)) return reply.code(404).send({ error: "Brano non trovato" });
    const { rows } = await pool.query("DELETE FROM music_tracks WHERE id = $1 RETURNING url", [req.params.id]);
    if (rows[0]?.url?.startsWith("/api/media/")) fs.rmSync(path.join(MEDIA_DIR, path.basename(rows[0].url)), { force: true });
    return { ok: true };
  });

  app.get("/api/admin/orders", async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;
    const { rows } = await pool.query(
      `SELECT o.id, o.amount_cents, o.source, o.status, o.created_at, i.config->>'title' AS title, u.email
       FROM orders o LEFT JOIN invitations i ON i.id = o.invitation_id LEFT JOIN users u ON u.id = i.user_id
       ORDER BY o.created_at DESC LIMIT 200`,
    );
    return rows;
  });

  app.get("/api/admin/users", async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.name, u.role, u.created_at, (SELECT count(*)::int FROM invitations i WHERE i.user_id = u.id) AS invitations
       FROM users u ORDER BY u.created_at DESC LIMIT 500`,
    );
    return rows;
  });

  app.patch<{ Params: { id: string } }>("/api/admin/users/:id", async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;
    const role = (req.body as { role?: string })?.role;
    if (role !== "admin" && role !== "user") return reply.code(400).send({ error: "Ruolo non valido" });
    if (!UUID.test(req.params.id)) return reply.code(404).send({ error: "Utente non trovato" });
    await pool.query("UPDATE users SET role = $2 WHERE id = $1", [req.params.id, role]);
    return { ok: true };
  });

  // Solo fuori produzione: le email in outbox, per verificare il flusso senza provider di posta.
  app.get("/api/dev/outbox", async (_req, reply) => {
    if (isProd) return reply.code(404).send({ error: "Non disponibile" });
    const { rows } = await pool.query("SELECT to_address AS to, subject, text, created_at FROM outbox ORDER BY id DESC LIMIT 100");
    return rows;
  });

  registerGoogle(app);
  return app;
}

export async function startApi() {
  await migrate();
  // Se ADMIN_EMAIL è impostata, quell'utente diventa admin all'avvio (utile dopo il primo deploy).
  if (process.env.ADMIN_EMAIL) {
    await pool.query("UPDATE users SET role = 'admin' WHERE email = $1", [process.env.ADMIN_EMAIL.toLowerCase()]);
  }
  const app = await buildApp();
  const port = Number(process.env.PORT ?? 4000);
  await app.listen({ port, host: "0.0.0.0" });
  return app;
}

export type { Catalog, AddonKey, MailMessage, InviteConfig };
export { getAddon };
