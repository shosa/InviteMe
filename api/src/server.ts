import { startApi } from "./app";

startApi().catch((err) => {
  console.error("Avvio API non riuscito:", err);
  process.exit(1);
});
