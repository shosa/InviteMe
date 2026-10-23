import Anthropic from "@anthropic-ai/sdk";
import { pool } from "./db";

// Parametri di gestione dell'assistente, modificabili dalla console admin (tabella settings, chiave 'assistant').
// L'elenco dei modelli non è nel codice: lo legge l'API ufficiale di Anthropic con la chiave del server.

export const EFFORTS = ["low", "medium", "high"] as const;
export type Effort = (typeof EFFORTS)[number];
export type AssistantSettings = { model: string; effort: Effort; callLimit: number };
export type ModelOption = { id: string; name: string };
export type AssistantSource = "console" | "ambiente" | "predefinito";

// Valori di ripiego se né la console né l'ambiente li impostano.
const FALLBACK: AssistantSettings = { model: "claude-opus-5-5", effort: "medium", callLimit: 40 };
const MODELS_TTL_MS = 10 * 60 * 1000;

let modelsCache: { at: number; models: ModelOption[] } | null = null;

// Impostazioni salvate dalla console, con il ripiego sull'ambiente (ASSISTANT_MODEL) e poi sul valore di base.
export async function loadAssistantSettings(): Promise<{ settings: AssistantSettings; source: AssistantSource }> {
  const { rows } = await pool.query("SELECT value FROM settings WHERE key = 'assistant'");
  const saved = (rows[0]?.value ?? {}) as Partial<Record<keyof AssistantSettings, unknown>>;
  const savedModel = typeof saved.model === "string" && saved.model.length > 0 && saved.model.length <= 100 ? saved.model : null;
  const envModel = process.env.ASSISTANT_MODEL?.trim() || null;
  const effort = EFFORTS.find((e) => e === saved.effort) ?? FALLBACK.effort;
  const callLimit = Number.isInteger(saved.callLimit) && (saved.callLimit as number) >= 1 && (saved.callLimit as number) <= 500 ? (saved.callLimit as number) : FALLBACK.callLimit;
  const model = savedModel ?? envModel ?? FALLBACK.model;
  const source: AssistantSource = savedModel ? "console" : envModel ? "ambiente" : "predefinito";
  return { settings: { model, effort, callLimit }, source };
}

export async function saveAssistantSettings(s: AssistantSettings): Promise<void> {
  await pool.query(
    `INSERT INTO settings (key, value, updated_at) VALUES ('assistant', $1, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [JSON.stringify(s)],
  );
}

// Modelli attivi per la chiave del server, dall'API ufficiale. Il risultato resta in memoria per pochi minuti.
export async function listAssistantModels(apiKey: string): Promise<ModelOption[]> {
  if (modelsCache && Date.now() - modelsCache.at < MODELS_TTL_MS) return modelsCache.models;
  const client = new Anthropic({ apiKey });
  const models: ModelOption[] = [];
  for await (const m of client.models.list({ limit: 100, lifecycle: ["active"] })) models.push({ id: m.id, name: m.display_name });
  modelsCache = { at: Date.now(), models };
  return models;
}
