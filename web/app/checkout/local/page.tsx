"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

// Checkout di sviluppo: usato solo quando Shopify non è configurato.
function LocalCheckout() {
  const params = useSearchParams();
  const invitationId = params.get("invitation") ?? "";
  const [state, setState] = useState<"idle" | "paying" | "done" | "error">("idle");

  async function pay() {
    setState("paying");
    const res = await fetch("/api/checkout/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId }),
    });
    if (!res.ok) return setState("error");
    setState("done");
    window.location.href = `/editor/${invitationId}`;
  }

  return (
    <main className="checkout-local">
      <div className="panel">
        <p className="kicker">Modalità sviluppo</p>
        <h1>Pagamento di prova</h1>
        <p>Shopify non è ancora collegato. Questo passaggio simula un pagamento riuscito per testare l'intero flusso.</p>
        <button className="btn primary" onClick={pay} disabled={!invitationId || state === "paying"}>
          {state === "paying" ? "Elaboro…" : "Simula pagamento riuscito"}
        </button>
        {state === "error" && <p role="alert" className="error">Pagamento non riuscito. Riprova.</p>}
        <a className="back" href={`/editor/${invitationId}`}>Torna al configuratore</a>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LocalCheckout />
    </Suspense>
  );
}
