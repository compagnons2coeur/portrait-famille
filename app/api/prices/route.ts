/**
 * Legacy route of the former tunnel (no longer mounted): closed for good (health check of 02/11/2026,
 * mission 2026-11-02-03). It was reachable without any guard and pasted the received ids into the text of a Shopify Admin GraphQL
 * query (injection: any read query with the shop's Admin token). Nothing is read, nothing is sent to Shopify.
 */
export const dynamic = "force-dynamic";

const gone = () => new Response(JSON.stringify({ error: "Ce service n’existe plus." }), { status: 410,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
export const GET = gone;
export const POST = gone;
export const PUT = gone;
export const DELETE = gone;
