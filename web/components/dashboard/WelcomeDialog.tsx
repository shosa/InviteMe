"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { Confetti, Trophy } from "./Clipart";

// Popup della prima apertura dopo il pagamento: complimenti, il link da condividere e i pulsanti per inviarlo.
export function WelcomeDialog({ url, title, color, lang = "it", open }: { url: string; title: string; color: string; lang?: "it" | "en"; open: boolean }) {
  const [visible, setVisible] = useState(open);
  const [copied, setCopied] = useState(false);
  const T = lang === "en"
    ? { head: "Congratulations, your invitation is live!", body: "Share the link with your guests: it opens on any phone, no app needed.", copy: "Copy link", copied: "Copied", wa: "Send on WhatsApp", close: "Go to my dashboard", msg: (u: string) => `You're invited! All the details here: ${u}` }
    : { head: "Complimenti, il vostro invito è online!", body: "Condividete il link con gli ospiti: si apre da qualunque telefono, senza installare nulla.", copy: "Copia link", copied: "Copiato", wa: "Invia su WhatsApp", close: "Vai alla mia dashboard", msg: (u: string) => `Vi invitiamo! Trovate tutti i dettagli qui: ${u}` };

  if (!visible) return null;
  async function copy() {
    await navigator.clipboard?.writeText(url).catch(() => undefined);
    setCopied(true);
  }
  return (
    <div className="welcome-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setVisible(false); }}>
      <div className="welcome" role="dialog" aria-modal="true" aria-labelledby="welcome-title" style={{ "--inv": color } as React.CSSProperties}>
        <div className="welcome-art" aria-hidden="true">
          <Confetti className="welcome-confetti welcome-confetti-l" color={color} />
          <Trophy color={color} />
          <Confetti className="welcome-confetti welcome-confetti-r" color={color} />
        </div>
        <h2 id="welcome-title">{T.head}</h2>
        <p className="hint">{T.body}</p>
        <p className="welcome-title-of">{title}</p>
        <div className="welcome-link">
          <code>{url}</code>
          <button type="button" className="btn outline small" onClick={copy}>
            {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
            {copied ? T.copied : T.copy}
          </button>
        </div>
        <div className="welcome-actions">
          <a className="btn solid" href={`https://wa.me/?text=${encodeURIComponent(T.msg(url))}`} target="_blank" rel="noreferrer">
            <MessageCircle size={16} aria-hidden="true" />{T.wa}
          </a>
          <button type="button" className="btn ghost" onClick={() => setVisible(false)}>{T.close}</button>
        </div>
      </div>
    </div>
  );
}
