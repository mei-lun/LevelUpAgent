import assert from "node:assert/strict";
import test from "node:test";
import { TtlCache } from "../src/ttl-cache.mjs";

test("returns a live cached value", () => {
  const cache = new TtlCache();
  cache.set("name", "Ada", 100, 1_000);
  assert.equal(cache.get("name", 1_050), "Ada");
});

test("removes a value after its expiry", () => {
  const cache = new TtlCache();
  cache.set("name", "Ada", 100, 1_000);
  assert.equal(cache.get("name", 1_101), undefined);
  assert.equal(cache.size, 0);
});
