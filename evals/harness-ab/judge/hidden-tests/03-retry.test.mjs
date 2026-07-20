import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { pathToFileURL } from "node:url";

const workspace = process.env.CASE_WORKSPACE;
const { retry } = await import(pathToFileURL(path.join(workspace, "src/retry.mjs")));

test("uses maxAttempts as the total number of calls and throws the last error", async () => {
  const errors = [new Error("one"), new Error("two"), new Error("three")];
  let calls = 0;
  await assert.rejects(
    retry(async () => { throw errors[calls++]; }, { maxAttempts: 3 }),
    (error) => error === errors[2],
  );
  assert.equal(calls, 3);
});

test("stops immediately when shouldRetry returns false", async () => {
  const expected = new Error("permanent");
  let calls = 0;
  let delays = 0;
  await assert.rejects(retry(async () => {
    calls += 1;
    throw expected;
  }, {
    shouldRetry: (error, attempt) => error !== expected || attempt !== 1,
    delay: async () => { delays += 1; },
  }), (error) => error === expected);
  assert.equal(calls, 1);
  assert.equal(delays, 0);
});

test("calls delay only before a real next attempt with the failed attempt number", async () => {
  const seen = [];
  let calls = 0;
  const value = await retry(async () => {
    calls += 1;
    if (calls < 3) throw new Error(`e${calls}`);
    return "ok";
  }, { maxAttempts: 3, delay: async (attempt, error) => seen.push([attempt, error.message]) });
  assert.equal(value, "ok");
  assert.deepEqual(seen, [[1, "e1"], [2, "e2"]]);
});

test("rejects invalid maxAttempts", async () => {
  for (const value of [0, -1, 1.5, NaN, Infinity, "3"]) {
    await assert.rejects(retry(async () => "ok", { maxAttempts: value }), RangeError);
  }
});
