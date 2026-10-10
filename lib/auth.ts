import crypto from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";
import { query, update, type User } from "./store";

const scrypt = promisify(crypto.scrypt) as (pw: string, salt: Buffer, keylen: number) => Promise<Buffer>;

export const SESSION_COOKIE = "inviteme_session";
const SESSION_DAYS = 30;
const RESET_MINUTES = 60;

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

const cookieOpts = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge,
});

// Crea una sessione e imposta il cookie. Il database conserva solo l'hash del token.
export async function startSession(userId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();
  await update((db) => {
    db.sessions = db.sessions.filter((s) => new Date(s.expiresAt) > new Date());
    db.sessions.push({ tokenHash: hashToken(token), userId, expiresAt });
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, cookieOpts(SESSION_DAYS * 86_400));
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const h = hashToken(token);
    await update((db) => {
      db.sessions = db.sessions.filter((s) => s.tokenHash !== h);
    });
  }
  jar.set(SESSION_COOKIE, "", cookieOpts(0));
}

// Utente della richiesta corrente, o null.
export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const h = hashToken(token);
  return query((db) => {
    const s = db.sessions.find((x) => x.tokenHash === h);
    if (!s || new Date(s.expiresAt) < new Date()) return null;
    return db.users.find((u) => u.id === s.userId) ?? null;
  });
}

export async function createResetToken(userId: string): Promise<string> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + RESET_MINUTES * 60_000).toISOString();
  await update((db) => {
    db.resets = db.resets.filter((r) => new Date(r.expiresAt) > new Date() && r.userId !== userId);
    db.resets.push({ tokenHash: hashToken(token), userId, expiresAt });
  });
  return token;
}

// Consuma un token di reset (una sola volta). Ritorna l'id utente o null.
export async function consumeResetToken(token: string): Promise<string | null> {
  const h = hashToken(token);
  return update((db) => {
    const r = db.resets.find((x) => x.tokenHash === h);
    db.resets = db.resets.filter((x) => x.tokenHash !== h);
    if (!r || new Date(r.expiresAt) < new Date()) return null;
    return r.userId;
  });
}

// L'invito appartiene all'utente loggato?
export async function ownsInvitation(inv: { userId: string }): Promise<boolean> {
  const user = await currentUser();
  return !!user && user.id === inv.userId;
}

// Metriche e export admin: richiedono ADMIN_TOKEN (Authorization: Bearer ...).
// Senza ADMIN_TOKEN sono accessibili solo in sviluppo.
export function adminAllowed(req: Request): boolean {
  const configured = process.env.ADMIN_TOKEN;
  if (!configured) return process.env.NODE_ENV !== "production";
  const auth = req.headers.get("authorization") ?? "";
  const given = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const a = Buffer.from(hashToken(given));
  const b = Buffer.from(hashToken(configured));
  return crypto.timingSafeEqual(a, b);
}
