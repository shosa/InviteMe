import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "flag-icons/css/flag-icons.min.css";
import "./globals.css";
import { Toaster } from "@/components/ui/Toaster";
import { getLang } from "@/lib/i18n";

// Titoli in Space Grotesk, testo in Inter: scaricati in build e serviti dal nostro dominio.
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap", weight: ["500", "700"] });
const text = Inter({ subsets: ["latin"], variable: "--font-text", display: "swap", weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "InviteMe · Inviti digitali con musica e conferma di presenza",
  description: "Un invito digitale come una stampa su carta: busta sigillata, musica al primo tocco, programma, mappa e conferme in tempo reale.",
};

export const viewport: Viewport = {
  themeColor: "#F5F6F8",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} className={`${display.variable} ${text.variable}`}>
      <body>{children}<Toaster /></body>
    </html>
  );
}
