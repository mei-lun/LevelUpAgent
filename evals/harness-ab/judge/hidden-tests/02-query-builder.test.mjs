import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { pathToFileURL } from "node:url";

const workspace = process.env.CASE_WORKSPACE;
const { buildQuery } = await import(pathToFileURL(path.join(workspace, "src/query.mjs")));

test("omits nullish scalar and array values", () => {
  assert.equal(buildQuery({ a: null, b: undefined, c: [null, "x", undefined, "y"] }), "?c=x&c=y");
  assert.equal(buildQuery({ a: [], b: null }), "");
});

test("supports booleans, finite numbers and encoded keys", () => {
  assert.equal(buildQuery({ "a b": true, n: -1.5 }), "?a%20b=true&n=-1.5");
});

test("sorts by Unicode code point rather than UTF-16 code unit", () => {
  assert.equal(buildQuery({ "😀": 2, "\uE000": 1 }), "?%EE%80%80=1&%F0%9F%98%80=2");
});

test("rejects unsupported values including inside arrays", () => {
  for (const value of [{}, () => {}, Symbol("x"), 1n, NaN, Infinity, -Infinity]) {
    assert.throws(() => buildQuery({ value }), TypeError);
    assert.throws(() => buildQuery({ value: ["ok", value] }), TypeError);
  }
});
