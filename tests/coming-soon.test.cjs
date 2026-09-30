const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// Lot 0 (30/09/2026) : tant que l'atelier commun n'est pas ouvert, la page publique ne promet rien.
const page = fs.readFileSync(path.join(__dirname, "../app/page.tsx"), "utf8");
const layout = fs.readFileSync(path.join(__dirname, "../app/layout.tsx"), "utf8");
const visible = (page + layout).replace(/\/\/.*$/gm, "");

test("the public page no longer mounts the historical tunnel", () => {
  assert.doesNotMatch(page, /^import /m);
  assert.doesNotMatch(page, /<PortraitTunnel/);
  assert.doesNotMatch(page, /api\//);
});

test("no promise of free previews, styles, prices or supports", () => {
  for (const forbidden of [/gratuit/i, /offert/i, /aperçu/i, /\d+\s*styles?/i, /€/, /tableau/i, /toile/i, /jour/i])
    assert.doesNotMatch(visible, forbidden);
  assert.match(page, /Bientôt disponible/);
});

test("links only to the live textile product pages and the shop", () => {
  const links = [...page.matchAll(/`\$\{SHOP\}([^`]*)`/g)].map((match) => match[1]);
  assert.deepEqual(links, ["/products/t-shirt-personnalise-photo-animal", "/products/sweat-capuche-personnalise-photo-animal"]);
  assert.match(page, /const SHOP = "https:\/\/compagnonsdecoeur\.fr";/);
});

test("placeholder is not indexed", () => {
  assert.match(layout, /robots: \{ index: false, follow: true \}/);
});
