import { promises as fs } from "fs";
import path from "path";
import type { Invitation } from "./invitation";

// Archivio locale (file JSON). Le operazioni passano da update/query, così l'accesso concorrente
// resta serializzato. Per la produzione: sostituire con Postgres mantenendo queste funzioni.
export type User = { id: string; email: string; name: string; passwordHash: string; createdAt: string };
export type Session = { tokenHash: string; userId: string; expiresAt: string };
export type PasswordReset = { tokenHash: string; userId: string; expiresAt: string };

export type Rsvp = {
  id: string;
  invitationId: string;
  createdAt: string;
  answers: Record<string, string | number | boolean>;
};

export type Order = {
  id: string;
  invitationId: string;
  createdAt: string;
  amountCents: number;
  currency: string;
  source: "shopify" | "local";
  status: "pending" | "paid";
  checkoutUrl?: string;
};

export type Db = {
  users: User[];
  sessions: Session[];
  resets: PasswordReset[];
  invitations: Invitation[];
  rsvps: Rsvp[];
  orders: Order[];
  events: { type: string; invitationId?: string; at: string }[];
};

const FILE = path.join(process.cwd(), "data", "db.json");
const EMPTY: Db = { users: [], sessions: [], resets: [], invitations: [], rsvps: [], orders: [], events: [] };

let queue: Promise<unknown> = Promise.resolve();

async function read(): Promise<Db> {
  try {
    return { ...structuredClone(EMPTY), ...(JSON.parse(await fs.readFile(FILE, "utf8")) as Partial<Db>) };
  } catch {
    return structuredClone(EMPTY);
  }
}

async function write(db: Db) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, FILE); // scrittura atomica: nessun file a metà in caso di crash
}

export function update<T>(fn: (db: Db) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const db = await read();
    const result = await fn(db);
    await write(db);
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

export function query<T>(fn: (db: Db) => T): Promise<T> {
  return read().then(fn);
}

export function track(db: Db, type: string, invitationId?: string) {
  db.events.push({ type, invitationId, at: new Date().toISOString() });
  if (db.events.length > 5000) db.events.splice(0, db.events.length - 5000);
}
