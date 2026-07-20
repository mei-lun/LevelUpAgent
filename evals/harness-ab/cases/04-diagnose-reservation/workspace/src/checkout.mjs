export async function checkout(cart, { inventory, payment, orders }) {
  const reservation = await inventory.reserve(cart.items);
  const charge = await payment.charge({
    amount: cart.total,
    paymentMethod: cart.paymentMethod,
    idempotencyKey: cart.id,
  });
  const order = await orders.create({ cart, reservation, charge });
  await inventory.commit(reservation.id);
  return order;
}
