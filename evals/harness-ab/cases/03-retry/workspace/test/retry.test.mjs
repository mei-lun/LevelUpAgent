import assert from "node:assert/strict";
import test from "node:test";
import { retry } from "../src/retry.mjs";

test("returns after a later attempt succeeds", async () => {
  let calls = 0;
  const value = await retry(async () => {
    calls += 1;
    if (calls < 2) throw new Error("temporary");
    return "ok";
  });
  assert.equal(value, "ok");
  assert.equal(calls, 2);
});
