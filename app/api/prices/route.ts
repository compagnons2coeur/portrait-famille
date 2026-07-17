import { NextResponse } from "next/server";
import { shopifyAdminFetch } from "@/lib/shopify";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Collect all variant IDs from the tunnel's SupportSelector at build/request time
    // via query param — client sends ids as comma-separated list
    return NextResponse.json({ error: "Use POST with ids" }, { status: 405 });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { ids } = (await request.json()) as { ids: number[] };

    if (!ids?.length) return NextResponse.json({});

    // Shopify GraphQL: fetch up to 250 variants in one shot
    const gids = ids.map(id => `"gid://shopify/ProductVariant/${id}"`).join(", ");
    const query = `{
      nodes(ids: [${gids}]) {
        ... on ProductVariant {
          id
          price
        }
      }
    }`;

    const res = await shopifyAdminFetch(
      "/admin/api/2024-01/graphql.json",
      {
        method: "POST",
        body: JSON.stringify({ query }),
      }
    );

    const json = (await res.json()) as {
      data?: { nodes: Array<{ id: string; price: string } | null> };
    };

    // Build map: numericId → price (number)
    const prices: Record<number, number> = {};
    for (const node of json.data?.nodes ?? []) {
      if (!node) continue;
      const numericId = parseInt(node.id.split("/").pop()!);
      prices[numericId] = parseFloat(node.price);
    }

    return NextResponse.json(prices);
  } catch {
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
  }
}
