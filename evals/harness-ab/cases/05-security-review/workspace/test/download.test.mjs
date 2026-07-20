import assert from "node:assert/strict";
import test from "node:test";

test("review fixture loads", async () => {
  const module = await import("../src/download.mjs");
  assert.equal(typeof module.loadDownload, "function");
});
