import assert from "node:assert/strict";
import test from "node:test";
import { buildQuery } from "../src/query.mjs";

test("sorts keys and encodes values", () => {
  assert.equal(buildQuery({ q: "red fox", page: 2 }), "?page=2&q=red%20fox");
});

test("uses repeated keys for arrays", () => {
  assert.equal(buildQuery({ tag: ["a", "b"] }), "?tag=a&tag=b");
});
