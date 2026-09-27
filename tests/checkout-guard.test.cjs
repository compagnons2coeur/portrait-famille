const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../app/api/checkout/route.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function loadRoute(flag) {
  const calls = { bodyReads: 0, token: 0, fetch: 0, shopify: [] };
  const exports = {};
  const env = flag === undefined ? {} : { PORTRAIT_CHECKOUT_ENABLED: flag };

  vm.runInNewContext(compiled, {
    exports,
    process: { env },
    URL,
    Response,
    console,
    fetch: async () => { calls.fetch++; throw new Error("Unexpected network request"); },
    require: (name) => {
      if (name === "next/server") {
        return { NextResponse: { json: (body, init = {}) => new Response(JSON.stringify(body), {
          status: init.status ?? 200,
          headers: { "Content-Type": "application/json", ...init.headers },
        }) } };
      }
      if (name === "@/lib/shopify") {
        return {
          getShopifyAdminToken: async () => { calls.token++; throw new Error("Unexpected Shopify token use"); },
          shopifyAdminFetch: async (route, init) => {
            calls.shopify.push({ route, init });
            return new Response(JSON.stringify({ draft_order: { invoice_url: "https://example.test/mock-checkout" } }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          },
        };
      }
      throw new Error(`Unexpected import: ${name}`);
    },
  }, { filename: "app/api/checkout/route.ts" });

  const request = {
    url: "https://example.test/api/checkout",
    json: async () => {
      calls.bodyReads++;
      return { items: [{ variantId: 123, portraitUrl: "https://example.test/portrait.jpg" }] };
    },
  };
  return { POST: exports.POST, calls, request };
}

for (const [label, flag] of [["absent", undefined], ["false", "false"], ["empty", ""], ["non-exact", "TRUE"]]) {
  test(`checkout disabled when flag is ${label}`, async () => {
    const { POST, calls, request } = loadRoute(flag);
    const response = await POST(request);

    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "checkout_temporarily_unavailable" });
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(calls.bodyReads, 0);
    assert.equal(calls.token, 0);
    assert.equal(calls.fetch, 0);
    assert.equal(calls.shopify.length, 0);
  });
}

test("exact true keeps the historical Shopify checkout path", async () => {
  const { POST, calls, request } = loadRoute("true");
  const response = await POST(request);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { checkoutUrl: "https://example.test/mock-checkout" });
  assert.equal(calls.bodyReads, 1);
  assert.equal(calls.shopify.length, 1);
  assert.equal(calls.shopify[0].route, "/admin/api/2024-10/draft_orders.json");
  assert.equal(calls.shopify[0].init.method, "POST");
  assert.equal(JSON.parse(calls.shopify[0].init.body).draft_order.line_items[0].variant_id, 123);
  assert.equal(calls.fetch, 0);
  assert.equal(calls.token, 0);
});
