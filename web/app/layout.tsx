import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Familjen_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/Toaster";

// Display didone e testo grotesco: scaricati in build e serviti dal nostro dominio.
const display = Bodoni_Moda({ subsets: ["latin"], variable: "--font-display", display: "swap", style: ["normal", "italic"] });
const text = Familjen_Grotesk({ subsets: ["latin"], variable: "--font-text", display: "swap" });

export const metadata: Metadata = {
  title: "InviteMe · Inviti digitali con musica e conferma di presenza",
  description: "Un invito digitale come una stampa su carta: busta sigillata, musica al primo tocco, programma, mappa e conferme in tempo reale.",
};

export const viewport: Viewport = {
  themeColor: "#ECEEE8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${display.variable} ${text.variable}`}>
      <body>{children}<Toaster /></body>
    </html>
  );
}
