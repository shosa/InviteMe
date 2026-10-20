"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { ui } from "@/lib/ui";

// Copia il link pubblico dell'invito negli appunti, con conferma visiva e per lettori di schermo.
export function CopyLink({ path, lang = "it" }: { path: string; lang?: "it" | "en" }) {
  const t = ui(lang);
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn outline small"
      onClick={async () => {
        await navigator.clipboard?.writeText(`${window.location.origin}${path}`).catch(() => undefined);
        setDone(true);
        setTimeout(() => setDone(false), 1800);
      }}
    >
      {done ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
      {done ? t.copied : t.copyLink}
      <span className="visually-hidden" role="status">{done ? t.copied : ""}</span>
    </button>
  );
}
