import assert from "node:assert/strict";
import test from "node:test";
import { invoiceTotal } from "../src/invoice.mjs";

test("calculates an invoice without a discount", () => {
  assert.equal(invoiceTotal([{ unitPrice: 1_000, quantity: 2 }], 0, 0.1), 2_200);
});

test("calculates a simple discounted invoice", () => {
  assert.equal(invoiceTotal([{ unitPrice: 1_000, quantity: 1 }], 10, 0.1), 990);
});
