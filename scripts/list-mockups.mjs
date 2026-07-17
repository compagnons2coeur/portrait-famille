// Liste les mockups DynamicMockups du compte avec leurs UUIDs.
// Inclut les mockups rangés dans des dossiers (collections).
// Usage : node scripts/list-mockups.mjs   (depuis la racine du projet)
import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
const key = env.match(/DYNAMIC_MOCKUPS_API_KEY=(.+)/)?.[1]?.trim();
if (!key) {
  console.error("DYNAMIC_MOCKUPS_API_KEY introuvable dans .env.local");
  process.exit(1);
}

const headers = { "x-api-key": key, Accept: "application/json" };

async function apiGet(path) {
  const res = await fetch(`https://app.dynamicmockups.com/api/v1${path}`, {
    headers,
  });
  if (!res.ok) {
    console.error(`Erreur API (${res.status}) ${path}:`, await res.text());
    process.exit(1);
  }
  return res.json();
}

function printMockup(m, prefix = "") {
  console.log(`${prefix}${m.name ?? "(sans nom)"}`);
  console.log(`${prefix}  mockup_uuid       : ${m.uuid}`);
  for (const so of m.smart_objects ?? []) {
    console.log(
      `${prefix}  smart_object_uuid : ${so.uuid}  (${so.name ?? "?"})`
    );
  }
  console.log("");
}

const rootJson = await apiGet("/mockups?include_all_catalogs=true");
const rootMockups = rootJson.data ?? rootJson.mockups ?? [];

const catalogsJson = await apiGet("/catalogs");
const catalogs = catalogsJson.data ?? [];

const collectionsJson = await apiGet("/collections?include_all_catalogs=true");
const collections = collectionsJson.data ?? [];

let total = rootMockups.length;
const seen = new Set();

function addMockups(mockups, prefix, label) {
  const fresh = mockups.filter((m) => !seen.has(m.uuid));
  for (const m of fresh) seen.add(m.uuid);
  total += fresh.length;

  console.log(`${label} : ${fresh.length} mockup(s)\n`);
  for (const m of fresh) {
    printMockup(m, prefix);
  }
  return fresh.length;
}

addMockups(rootMockups, "", "Racine / tous catalogues (sans filtre collection)");

for (const catalog of catalogs) {
  const catJson = await apiGet(
    `/mockups?catalog_uuid=${encodeURIComponent(catalog.uuid)}&include_all_catalogs=true`
  );
  const mockups = catJson.data ?? catJson.mockups ?? [];
  addMockups(
    mockups,
    "  ",
    `📂 Catalogue « ${catalog.name ?? catalog.uuid} »`
  );
}

for (const col of collections) {
  const colJson = await apiGet(
    `/mockups?collection_uuid=${encodeURIComponent(col.uuid)}`
  );
  const mockups = colJson.data ?? colJson.mockups ?? [];
  addMockups(
    mockups,
    "  ",
    `📁 Collection « ${col.name ?? col.uuid} » (${col.mockup_count ?? "?"} attendu(s))`
  );
}

console.log(`Total unique : ${seen.size} mockup(s)`);
