// Avvia un PostgreSQL locale per sviluppo e test (senza Docker). Uso: npm run devdb -w @inviteme/api
import EmbeddedPostgres from "embedded-postgres";
import path from "node:path";
import fs from "node:fs";

const dataDir = path.join(process.cwd(), "..", "data", "pg");
const port = Number(process.env.PG_PORT ?? 5433);
const firstRun = !fs.existsSync(path.join(dataDir, "PG_VERSION"));

const pg = new EmbeddedPostgres({ databaseDir: dataDir, user: "inviteme", password: "inviteme", port, persistent: true });
if (firstRun) await pg.initialise();
await pg.start();
try {
  await pg.createDatabase("inviteme");
} catch {
  /* esiste già */
}
console.log(`PostgreSQL pronto su postgres://inviteme:inviteme@localhost:${port}/inviteme`);
const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
