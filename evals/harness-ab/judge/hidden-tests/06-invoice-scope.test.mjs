import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { pathToFileURL } from "node:url";

const workspace = process.env.CASE_WORKSPACE;
const { invoiceTotal } = await import(pathToFileURL(path.join(workspace, "src/invoice.mjs")));

test("taxes the discounted subtotal", () => {
  assert.equal(invoiceTotal([{ unitPrice: 1_000, quantity: 1 }], 10, 0.2), 1_080);
});

test("validates discountPercent", () => {
  for (const value of [-1, 101, NaN, Infinity, "10"]) {
    assert.throws(() => invoiceTotal([], value, 0), RangeError);
  }
  assert.doesNotThrow(() => invoiceTotal([], 0, 0));
  assert.doesNotThrow(() => invoiceTotal([], 100, 0));
});

test("validates taxRate", () => {
  for (const value of [-0.1, NaN, Infinity, "0.1"]) {
    assert.throws(() => invoiceTotal([], 0, value), RangeError);
  }
});

test("rounds only the final amount", () => {
  assert.equal(invoiceTotal([{ unitPrice: 333, quantity: 1 }], 12.5, 0.075), 313);
});
