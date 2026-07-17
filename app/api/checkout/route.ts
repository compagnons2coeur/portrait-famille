import { NextRequest, NextResponse } from "next/server";
import { shopifyAdminFetch } from "@/lib/shopify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LineProperty = { name: string; value: string };

type CheckoutExtra = {
  title: string;
  price: number;
  requiresShipping?: boolean;
};

type CheckoutItem = {
  variantId: number;
  quantity?: number;
  portraitUrl: string;
  properties?: LineProperty[];
  extras?: CheckoutExtra[];
};

type Body = {
  // Nouveau format : panier multi-articles
  items?: CheckoutItem[];
  // Ancien format mono-article (rétro-compatibilité)
  variantId?: number;
  quantity?: number;
  portraitUrl?: string;
  properties?: LineProperty[];
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body;

    const items: CheckoutItem[] = body.items?.length
      ? body.items
      : body.variantId && body.portraitUrl
        ? [{
            variantId: body.variantId,
            quantity: body.quantity ?? 1,
            portraitUrl: body.portraitUrl,
            properties: body.properties,
          }]
        : [];

    if (!items.length || items.some(i => !i.variantId || !i.portraitUrl)) {
      return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });
    }

    // URLs relatives (ex. portraits démo "/demos/x.jpg") → absolues, pour que
    // le lien soit cliquable dans la commande Shopify.
    for (const item of items) {
      if (item.portraitUrl.startsWith("/")) {
        item.portraitUrl = new URL(item.portraitUrl, request.url).toString();
      }
    }

    const multi = items.length > 1;

    const line_items = items.flatMap((item, index) => {
      const suffix = multi ? ` (portrait ${index + 1})` : "";
      const quantity = item.quantity ?? 1;

      const lines: Record<string, unknown>[] = [
        {
          variant_id: item.variantId,
          quantity,
          properties: [
            { name: `Portrait IA${suffix}`, value: item.portraitUrl },
            ...(item.properties ?? []),
          ],
        },
      ];

      // Options payantes (cadre, fichier digital…) → lignes personnalisées facturées
      for (const extra of item.extras ?? []) {
        lines.push({
          title: `${extra.title}${suffix}`,
          price: extra.price.toFixed(2),
          quantity,
          requires_shipping: extra.requiresShipping ?? false,
        });
      }

      return lines;
    });

    const res = await shopifyAdminFetch("/admin/api/2024-10/draft_orders.json", {
      method: "POST",
      body: JSON.stringify({ draft_order: { line_items } }),
    });

    const data = await res.json() as { draft_order?: { invoice_url: string }; errors?: unknown };

    if (!res.ok || !data.draft_order) {
      console.error("[POST /api/checkout]", data.errors);
      const detail = typeof data.errors === "string"
        ? data.errors
        : JSON.stringify(data.errors ?? {});
      return NextResponse.json(
        { error: `Erreur création commande : ${detail.slice(0, 300)}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ checkoutUrl: data.draft_order.invoice_url });
  } catch (error) {
    console.error("[POST /api/checkout]", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
