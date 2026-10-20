"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ui } from "@/lib/ui";

// Elimina una bozza dopo conferma. Gli inviti pagati non arrivano qui: il server li rifiuta comunque.
export function DeleteDraft({ id, lang = "it" }: { id: string; lang?: "it" | "en" }) {
  const t = ui(lang);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!window.confirm(t.deleteDraftAsk)) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/invitations/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
      return;
    }
    setBusy(false);
    setError(t.deleteFailed);
  }

  return (
    <>
      <button type="button" className="btn ghost small" disabled={busy} onClick={remove}>
        <Trash2 size={15} aria-hidden="true" />
        {t.deleteDraft}
      </button>
      {error && <span role="alert" className="form-error">{error}</span>}
    </>
  );
}
