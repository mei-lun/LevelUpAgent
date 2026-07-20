import assert from "node:assert/strict";
import test from "node:test";
import { checkout } from "../src/checkout.mjs";
import { Inventory } from "../src/inventory.mjs";

test("commits inventory after a successful checkout", async () => {
  const inventory = new Inventory({ mug: 2 });
  const order = await checkout({ id: "c1", total: 10, paymentMethod: "card", items: [{ sku: "mug", quantity: 1 }] }, {
    inventory,
    payment: { charge: async () => ({ id: "p1" }) },
    orders: { create: async (value) => value },
  });
  assert.equal(order.charge.id, "p1");
  assert.equal(inventory.reservations.size, 0);
  assert.equal(inventory.stock.get("mug"), 1);
});
