import crypto from "crypto";

// Integrazione Shopify headless.
// - Con SHOPIFY_STORE_DOMAIN + SHOPIFY_STOREFRONT_TOKEN + SHOPIFY_VARIANT_ID: crea un carrello reale
//   e restituisce il checkoutUrl Shopify (pagamenti gestiti da Shopify).
// - Senza chiavi: modalità sviluppo, checkout simulato locale, così il flusso è testabile end-to-end.
// Le metriche arrivano dal webhook orders/paid (HMAC verificato con SHOPIFY_WEBHOOK_SECRET).

const API_VERSION = "2025-01";

export function shopifyConfigured(): boolean {
  return Boolean(
    process.env.SHOPIFY_STORE_DOMAIN &&
      process.env.SHOPIFY_STOREFRONT_TOKEN &&
      process.env.SHOPIFY_VARIANT_ID,
  );
}

// Il checkout di prova non incassa nulla: in produzione è spento a meno che non sia abilitato esplicitamente.
export function localCheckoutAllowed(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_LOCAL_CHECKOUT === "true";
}

export type CheckoutInput = {
  invitationId: string;
  slug: string;
  addons: string[];
  totalCents: number;
  origin: string;
};

export type CheckoutResult = { checkoutUrl: string; source: "shopify" | "local" };

export async function createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  if (!shopifyConfigured()) {
    return { checkoutUrl: `${input.origin}/checkout/local?invitation=${input.invitationId}`, source: "local" };
  }

  const domain = process.env.SHOPIFY_STORE_DOMAIN!;
  const token = process.env.SHOPIFY_STOREFRONT_TOKEN!;
  const variantId = process.env.SHOPIFY_VARIANT_ID!;

  const mutation = `
    mutation cartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart { id checkoutUrl }
        userErrors { field message }
      }
    }`;

  const body = {
    query: mutation,
    variables: {
      input: {
        lines: [
          {
            merchandiseId: variantId,
            quantity: 1,
            attributes: [
              { key: "invitationId", value: input.invitationId },
              { key: "slug", value: input.slug },
              { key: "addons", value: input.addons.join(",") || "none" },
              { key: "totalCents", value: String(input.totalCents) },
            ],
          },
        ],
        attributes: [{ key: "invitationId", value: input.invitationId }],
        note: `InviteMe ${input.slug}`,
      },
    },
  };

  const res = await fetch(`https://${domain}/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as {
    data?: { cartCreate?: { cart?: { checkoutUrl: string }; userErrors: { message: string }[] } };
    errors?: { message: string }[];
  };

  const url = json.data?.cartCreate?.cart?.checkoutUrl;
  if (!res.ok || !url) {
    const msg = json.errors?.[0]?.message ?? json.data?.cartCreate?.userErrors?.[0]?.message ?? `HTTP ${res.status}`;
    throw new Error(`Shopify checkout non disponibile: ${msg}`);
  }
  return { checkoutUrl: url, source: "shopify" };
}

// Verifica la firma X-Shopify-Hmac-Sha256 sul corpo grezzo della richiesta.
export function verifyShopifyWebhook(rawBody: string, hmacHeader: string | null): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret || !hmacHeader) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const a = Buffer.from(digest);
  const b = Buffer.from(hmacHeader);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Estrae l'id invito dagli attributi dell'ordine Shopify (note_attributes o line item properties).
export function invitationIdFromOrder(order: {
  note_attributes?: { name: string; value: string }[];
  line_items?: { properties?: { name: string; value: string }[] }[];
}): string | undefined {
  const fromNotes = order.note_attributes?.find((a) => a.name === "invitationId")?.value;
  if (fromNotes) return fromNotes;
  for (const item of order.line_items ?? []) {
    const p = item.properties?.find((x) => x.name === "invitationId")?.value;
    if (p) return p;
  }
  return undefined;
}
