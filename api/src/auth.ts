import crypto from "crypto";
import { promisify } from "util";
import type { FastifyReply, FastifyRequest } from "fastify";
import { pool } from "./db";

const scrypt = promisify(crypto.scrypt) as (pw: string, salt: Buffer, keylen: number) => Promise<Buffer>;

export const SESSION_COOKIE = "inviteme_session";
const SESSION_DAYS = 30;
const RESET_MINUTES = 60;
const isProd = process.env.NODE_ENV === "production";

export const hashToken = (t: string) => crypto.createHash("sha256").update(t).digest("hex");
export const randomToken = () => crypto.randomBytes(32).toString("base64url");

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltB64, keyB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export type SessionUser = { id: string; email: string; name: string; role: "user" | "admin" };

// Crea una sessione e imposta il cookie httpOnly. Il database conserva solo l'hash del token.
export async function startSession(reply: FastifyReply, userId: string) {
  const token = randomToken();
  await pool.query("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + ($3 || ' days')::interval)", [
    hashToken(token),
    userId,
    String(SESSION_DAYS),
  ]);
  reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function endSession(req: FastifyRequest, reply: FastifyReply) {
  const token = req.cookies[SESSION_COOKIE];
  if (token) await pool.query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
  reply.clearCookie(SESSION_COOKIE, { path: "/" });
}

// Utente della richiesta corrente, o null.
export async function currentUser(req: FastifyRequest): Promise<SessionUser | null> {
  const token = req.cookies[SESSION_COOKIE];
  if (!token) return null;
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.name, u.role FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashToken(token)],
  );
  return rows[0] ?? null;
}

export async function createResetToken(userId: string): Promise<string> {
  const token = randomToken();
  await pool.query("DELETE FROM password_resets WHERE user_id = $1", [userId]);
  await pool.query("INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES ($1, $2, now() + ($3 || ' minutes')::interval)", [
    hashToken(token),
    userId,
    String(RESET_MINUTES),
  ]);
  return token;
}

// Consuma il token di reset (una sola volta). Ritorna l'id utente o null.
export async function consumeResetToken(token: string): Promise<string | null> {
  const { rows } = await pool.query(
    "DELETE FROM password_resets WHERE token_hash = $1 AND expires_at > now() RETURNING user_id",
    [hashToken(token)],
  );
  return rows[0]?.user_id ?? null;
}

// Metriche e pannello admin: richiedono ADMIN_TOKEN. Senza ADMIN_TOKEN, solo fuori produzione.
export function adminAllowed(req: FastifyRequest): boolean {
  const configured = process.env.ADMIN_TOKEN;
  if (!configured) return !isProd;
  const auth = req.headers.authorization ?? "";
  const given = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return crypto.timingSafeEqual(Buffer.from(hashToken(given)), Buffer.from(hashToken(configured)));
}
