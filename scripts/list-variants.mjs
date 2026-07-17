// Liste les variantes Shopify des produits du tunnel (t-shirt + sweat) avec
// leur variantId, SKU, prix et options (Couleur / Taille).
// But : récupérer les variant IDs des 12 couleurs pour câbler l'overlay.
// Usage : node scripts/list-variants.mjs   (depuis la racine du projet)
import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
const val = (k) => env.match(new RegExp(`^${k}=(.+)`, "m"))?.[1]?.trim();

const SHOP = val("SHOPIFY_SHOP_DOMAIN");
const CLIENT_ID = val("SHOPIFY_CLIENT_ID");
const CLIENT_SECRET = val("SHOPIFY_CLIENT_SECRET");
let TOKEN = val("SHOPIFY_ADMIN_TOKEN");

if (!SHOP) {
  console.error("SHOPIFY_SHOP_DOMAIN introuvable dans .env.local");
  process.exit(1);
}

async function getToken() {
  if (TOKEN) return TOKEN;
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("SHOPIFY_ADMIN_TOKEN ou SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET requis dans .env.local");
    process.exit(1);
  }
  const res = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    console.error("Token Shopify:", data.error_description ?? data.error ?? res.status);
    process.exit(1);
  }
  return data.access_token;
}

TOKEN = await getToken();

// Variantes « repères » connues pour retrouver les 2 produits parents.
const ANCHORS = {
  "T-shirt": "53838635204951", // Off White XS actuel
  Sweat: "53838637465943", // Off White XS actuel
};

async function gql(query) {
  const res = await fetch(`https://${SHOP}/admin/api/2024-01/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": TOKEN },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  if (json.errors) {
    console.error("Erreur GraphQL:", JSON.stringify(json.errors, null, 2));
    process.exit(1);
  }
  return json.data;
}

async function productIdFromVariant(variantId) {
  const data = await gql(`{
    productVariant(id:"gid://shopify/ProductVariant/${variantId}") {
      product { id title }
    }
  }`);
  return data.productVariant?.product ?? null;
}

async function allVariants(productGid) {
  const out = [];
  let cursor = null;
  do {
    const after = cursor ? `, after:"${cursor}"` : "";
    const data = await gql(`{
      product(id:"${productGid}") {
        title
        variants(first:100${after}) {
          pageInfo { hasNextPage endCursor }
          edges { node {
            id sku price
            selectedOptions { name value }
          } }
        }
      }
    }`);
    const v = data.product?.variants;
    for (const e of v?.edges ?? []) out.push(e.node);
    cursor = v?.pageInfo?.hasNextPage ? v.pageInfo.endCursor : null;
  } while (cursor);
  return out;
}

// Produits supplémentaires par handle, passés en argument :
//   node scripts/list-variants.mjs tableau-toile-portrait-personnalise-animal
async function productIdFromHandle(handle) {
  const data = await gql(`{
    productByHandle(handle:"${handle}") { id title }
  }`);
  return data.productByHandle ?? null;
}

async function printProduct(label, product) {
  if (!product) {
    console.log(`\n### ${label} : produit introuvable\n`);
    return;
  }
  const variants = await allVariants(product.id);
  console.log(`\n### ${label} — « ${product.title} » (${variants.length} variantes)\n`);
  for (const v of variants) {
    const id = v.id.split("/").pop();
    const opts = v.selectedOptions.map((o) => `${o.name}=${o.value}`).join(" · ");
    console.log(`${id}  |  ${v.price} €  |  SKU:${v.sku ?? "—"}  |  ${opts}`);
  }
}

for (const [label, anchor] of Object.entries(ANCHORS)) {
  await printProduct(label, await productIdFromVariant(anchor));
}
for (const handle of process.argv.slice(2)) {
  await printProduct(handle, await productIdFromHandle(handle));
}
console.log("");
