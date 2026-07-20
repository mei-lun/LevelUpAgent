import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { pathToFileURL } from "node:url";

const workspace = process.env.CASE_WORKSPACE;
const { TtlCache } = await import(pathToFileURL(path.join(workspace, "src/ttl-cache.mjs")));

test("preserves falsy cached values", () => {
  for (const value of [0, false, ""]) {
    const cache = new TtlCache();
    cache.set("key", value, 10, 100);
    assert.strictEqual(cache.get("key", 109), value);
  }
});

test("expires and removes an entry at the exact boundary", () => {
  const cache = new TtlCache();
  cache.set("key", "value", 10, 100);
  assert.equal(cache.get("key", 110), undefined);
  assert.equal(cache.size, 0);
});

test("retains ordinary behavior", () => {
  const cache = new TtlCache();
  cache.set("key", "value", 10, 100);
  assert.equal(cache.has("key", 109), true);
  assert.equal(cache.get("missing", 109), undefined);
});
