// Svuota gli inviti (e le conferme collegate) per ripartire con il nuovo motore.
// PRIMA fa un backup JSON completo. Non parte senza --confirm. Non tocca utenti, catalogo e ordini (restano, senza invito).
// Uso: DATABASE_URL=... node scripts/reset-invitations.mjs --backup-dir /percorso/backup [--confirm]
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const args = process.argv.slice(2);
const dirIdx = args.indexOf("--backup-dir");
const backupDir = dirIdx >= 0 ? args[dirIdx + 1] : null;
const confirm = args.includes("--confirm");
if (!backupDir) {
  console.error("Manca --backup-dir: indica dove salvare il backup prima di cancellare.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const { rows: inv } = await client.query("SELECT * FROM invitations ORDER BY created_at");
  const { rows: rsvps } = await client.query("SELECT * FROM rsvps");
  const { rows: orders } = await client.query("SELECT * FROM orders ORDER BY created_at");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.mkdirSync(backupDir, { recursive: true });
  const file = path.join(backupDir, `inviti-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify({ invitations: inv, rsvps, orders }, null, 2));
  console.log(`Backup: ${file} (inviti ${inv.length}, pagati ${inv.filter((i) => i.status === "paid").length}, conferme ${rsvps.length}, ordini ${orders.length})`);
  if (!confirm) {
    console.log("Nessuna cancellazione: aggiungi --confirm per svuotare gli inviti.");
    process.exit(0);
  }
  await client.query("BEGIN");
  await client.query("DELETE FROM rsvps");
  await client.query("DELETE FROM invitations");
  await client.query("COMMIT");
  console.log("Inviti e conferme cancellati. Gli ordini sono rimasti, senza invito collegato.");
} catch (e) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw e;
} finally {
  await client.end();
}
