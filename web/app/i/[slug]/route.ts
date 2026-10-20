import { ApiError, apiPublicHtml } from "@/lib/api";

export const dynamic = "force-dynamic";

// La pagina invito è generata dal motore dell'API: qui solo la si inoltra, con le stesse intestazioni.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const html = await apiPublicHtml(`/api/public/invitations/${encodeURIComponent(slug)}/page`);
    if (html === null) return new Response("Invito non trovato", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
    return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" } });
  } catch (e) {
    if (e instanceof ApiError) return new Response("Invito non disponibile", { status: e.status, headers: { "content-type": "text/plain; charset=utf-8" } });
    throw e;
  }
}
