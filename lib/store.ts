import { promises as fs } from "fs";
import path from "path";
import type { Invitation } from "./invitation";

// Persistenza locale semplice (file JSON). In produzione sostituire con un database;
// l'interfaccia è volutamente piccola per rendere la sostituzione banale.
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
  invitations: Invitation[];
  rsvps: Rsvp[];
  orders: Order[];
  events: { type: string; invitationId?: string; at: string }[];
};

const FILE = path.join(process.cwd(), "data", "db.json");
const EMPTY: Db = { invitations: [], rsvps: [], orders: [], events: [] };

let queue: Promise<unknown> = Promise.resolve();

async function read(): Promise<Db> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as Db;
  } catch {
    return structuredClone(EMPTY);
  }
}

async function write(db: Db) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(db, null, 2), "utf8");
}

// Serializza le scritture per evitare race condition tra richieste concorrenti.
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
