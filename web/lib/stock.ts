// Foto da Pixabay: il server fa la ricerca e l'importazione, il browser non vede la chiave.
export type StockPhoto = { id: number; preview: string; user: string; pageUrl: string; width: number; height: number; tags: string };

// I filtri ammessi sono quelli della documentazione Pixabay; il server li ricontrolla.
export type StockFilters = {
  type: "all" | "photo" | "illustration";
  orientation: "all" | "horizontal" | "vertical";
  order: "popular" | "latest";
  color?: string;
  category?: string;
  editorsChoice: boolean;
  minWidth: number;
};

async function readError(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

export async function searchStock(invitationId: string, q: string, page: number, filters: StockFilters): Promise<StockPhoto[]> {
  const params = new URLSearchParams({ q, page: String(page), lang: "it", type: filters.type, orientation: filters.orientation, order: filters.order });
  if (filters.color) params.set("color", filters.color);
  if (filters.category) params.set("category", filters.category);
  if (filters.editorsChoice) params.set("editorsChoice", "true");
  if (filters.minWidth > 0) params.set("minWidth", String(filters.minWidth));
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
