import crypto, { randomUUID } from "crypto";
import type { FastifyInstance } from "fastify";
import { pool } from "./db";
import { startSession } from "./auth";

// Accesso con Google: OAuth 2.0 con PKCE. Il client secret resta sul server; il browser riceve solo il redirect.
const COOKIE = "g_oauth";
const isProd = process.env.NODE_ENV === "production";

const config = () => {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  return id && secret ? { id, secret } : null;
};
export const googleEnabled = () => config() !== null;

const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const redirectUri = () => `${appUrl()}/api/auth/google/callback`;
const b64u = (buf: Buffer) => buf.toString("base64url");

// Percorso interno sicuro: solo "/" seguito da una lettera, niente URL esterni.
const safeNext = (v: unknown) => (typeof v === "string" && /^\/[a-zA-Z]/.test(v) ? v : "/account");

export function registerGoogle(app: FastifyInstance) {
  app.get("/api/auth/google", async (req, reply) => {
    const c = config();
    if (!c) return reply.code(503).send({ error: "Accesso con Google non configurato" });

    const state = b64u(crypto.randomBytes(24));
    const verifier = b64u(crypto.randomBytes(32));
    const challenge = b64u(crypto.createHash("sha256").update(verifier).digest());
    const next = safeNext((req.query as { next?: string }).next);

    reply.setCookie(COOKIE, b64u(Buffer.from(JSON.stringify({ state, verifier, next }))), {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      maxAge: 600,
    });
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
      client_id: c.id,
      redirect_uri: redirectUri(),
      response_type: "code",
      scope: "openid email profile",
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
      prompt: "select_account",
    }).toString();
    return reply.redirect(url.toString());
  });

  app.get("/api/auth/google/callback", async (req, reply) => {
    const fail = () => {
      reply.clearCookie(COOKIE, { path: "/" });
      return reply.redirect(`${appUrl()}/accedi?error=google`);
    };
    const c = config();
    const q = req.query as { code?: string; state?: string; error?: string };
    const raw = req.cookies[COOKIE];
    if (!c || q.error || !q.code || !q.state || !raw) return fail();

    let saved: { state: string; verifier: string; next: string };
    try {
      saved = JSON.parse(Buffer.from(raw, "base64url").toString());
    } catch {
      return fail();
    }
    const a = Buffer.from(saved.state);
    const b = Buffer.from(q.state);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return fail();

    // Scambio del codice con il client secret, lato server.
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: q.code,
        client_id: c.id,
        client_secret: c.secret,
        redirect_uri: redirectUri(),
        grant_type: "authorization_code",
        code_verifier: saved.verifier,
      }),
    });
    if (!tokenRes.ok) return fail();
    const { id_token } = (await tokenRes.json()) as { id_token?: string };
    if (!id_token) return fail();

    // Google valida firma e scadenza del token; qui controlliamo destinatario ed email verificata.
    const infoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(id_token)}`);
    if (!infoRes.ok) return fail();
    const info = (await infoRes.json()) as { aud?: string; sub?: string; email?: string; email_verified?: string; name?: string };
    if (info.aud !== c.id || !info.sub || !info.email || info.email_verified !== "true") return fail();

    const email = info.email.toLowerCase();
    const name = (info.name ?? email.split("@")[0]).slice(0, 80);
    const existing = (await pool.query("SELECT id, google_sub FROM users WHERE email = $1", [email])).rows[0];
    let userId: string;
    if (existing) {
      // Un account con un'altra identità Google non va collegato a questa.
      if (existing.google_sub && existing.google_sub !== info.sub) return fail();
      if (!existing.google_sub) await pool.query("UPDATE users SET google_sub = $2 WHERE id = $1", [existing.id, info.sub]);
      userId = existing.id;
    } else {
      const role = process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL.toLowerCase() ? "admin" : "user";
      userId = randomUUID();
      await pool.query("INSERT INTO users (id, email, name, password_hash, role, google_sub) VALUES ($1, $2, $3, NULL, $4, $5)", [
        userId,
        email,
        name,
        role,
        info.sub,
      ]);
    }

    await startSession(reply, userId);
    reply.clearCookie(COOKIE, { path: "/" });
    return reply.redirect(`${appUrl()}${saved.next}`);
  });
}
