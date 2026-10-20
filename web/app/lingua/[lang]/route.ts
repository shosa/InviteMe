import { NextResponse } from "next/server";

// Imposta la lingua del sito nel cookie e torna alla pagina di provenienza.
export async function GET(req: Request, { params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const value = lang === "en" ? "en" : "it";
  const back = req.headers.get("referer") ?? "/";
  const res = NextResponse.redirect(new URL(back, req.url));
  res.cookies.set("lang", value, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
}
