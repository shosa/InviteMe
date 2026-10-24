"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ui, type Lang } from "@/lib/ui";

// Checkout di sviluppo: usato solo quando Shopify non è configurato.
function LocalCheckout({ lang }: { lang: Lang }) {
  const L = ui(lang).checkoutLocal;
  const params = useSearchParams();
  const invitationId = params.get("invitation") ?? "";
  // Nuovo flusso: l'ordine nasce prima dell'invito; dopo il pagamento si torna al builder.
  const orderId = params.get("order") ?? "";
  const [state, setState] = useState<"idle" | "paying" | "done" | "error">("idle");

  async function pay() {
    setState("paying");
    const res = await fetch("/api/checkout/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderId ? { orderId } : { invitationId }),
    });
    if (!res.ok) return setState("error");
    const data = (await res.json().catch(() => ({}))) as { invitationId?: string };
    setState("done");
    if (orderId && data.invitationId) window.location.href = `/editor/${data.invitationId}`;
    else window.location.href = `/invito/${invitationId}?benvenuto=1`;
  }

  return (
    <main className="checkout-local">
      <div className="panel">
        <p className="kicker">{L.kicker}</p>
        <h1>{L.title}</h1>
        <p>{L.body}</p>
        <button className="btn primary" onClick={pay} disabled={!(invitationId || orderId) || state === "paying"}>
          {state === "paying" ? L.paying : L.pay}
        </button>
        {state === "error" && <p role="alert" className="error">{L.error}</p>}
        <a className="back" href={`/editor/${invitationId}`}>{L.back}</a>
      </div>
    </main>
  );
}

export function LocalCheckoutPage({ lang }: { lang: Lang }) {
  return (
    <Suspense fallback={null}>
      <LocalCheckout lang={lang} />
    </Suspense>
  );
}
