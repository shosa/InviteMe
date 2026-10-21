// Foto da Pixabay: il server fa la ricerca e l'importazione, il browser non vede la chiave.
export type StockPhoto = { id: number; preview: string; user: string; pageUrl: string; width: number; height: number };

async function readError(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

export async function searchStock(invitationId: string, q: string, page: number, lang: "it" | "en"): Promise<StockPhoto[]> {
  const params = new URLSearchParams({ q, page: String(page), lang });
  const res = await fetch(`/api/invitations/${invitationId}/stock/search?${params}`);
  if (!res.ok) throw new Error(await readError(res, "Ricerca non riuscita"));
  return ((await res.json()) as { photos: StockPhoto[] }).photos;
}

// Restituisce l'indirizzo della foto salvata nell'invito.
export async function importStock(invitationId: string, id: number): Promise<string> {
  const res = await fetch(`/api/invitations/${invitationId}/stock/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error(await readError(res, "Importazione non riuscita"));
  return ((await res.json()) as { url: string }).url;
}
