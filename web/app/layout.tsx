import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InviteMe · Inviti digitali con musica, animazioni e conferma di presenza",
  description: "Crea in pochi minuti un invito digitale elegante: copertina animata, musica, mappa, programma e conferme in tempo reale.",
};

export const viewport: Viewport = {
  themeColor: "#f6f2ea",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
