// /api/prices and /api/checkout are closed for good (health check of 02/11/2026, mission 2026-11-02-04): every method answers 410
// without reading the body, without importing the Shopify client and without any network call.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function loadRoute(name) {
  const source = fs.readFileSync(path.join(__dirname, `../app/api/${name}/route.ts`), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const calls = { fetch: 0, imports: [] };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, Response, console, process: { env: { PORTRAIT_CHECKOUT_ENABLED: "true" } },
    fetch: async () => { calls.fetch++; throw new Error("Unexpected network request"); },
    require: (n) => { calls.imports.push(n); throw new Error(`Unexpected import: ${n}`); },
  }, { filename: `app/api/${name}/route.ts` });
  return { exports, calls, compiled };
}

for (const name of ["prices", "checkout"]) {
  test(`/api/${name} imports nothing (no Shopify client)`, () => {
    const { calls, compiled } = loadRoute(name);
    assert.deepEqual(calls.imports, []);
    assert.doesNotMatch(compiled, /shopifyAdminFetch|graphql\.json|nodes\(ids|draft_orders/);
  });
  for (const method of ["GET", "POST", "PUT", "DELETE"]) {
    test(`/api/${name} ${method} answers 410 without reading the request`, async () => {
      const { exports, calls } = loadRoute(name);
      let bodyReads = 0;
      const request = { url: `https://example.test/api/${name}`, json: async () => { bodyReads++; return { ids: ['1"]) { id } x: shop { name } #'] }; } };
      const response = await exports[method](request);
      assert.equal(response.status, 410);
      assert.deepEqual(await response.json(), { error: "Ce service n’existe plus." });
      assert.equal(response.headers.get("Cache-Control"), "no-store");
      assert.equal(response.headers.get("X-Robots-Tag"), "noindex");
      assert.equal(bodyReads, 0);
      assert.equal(calls.fetch, 0);
    });
  }
}
