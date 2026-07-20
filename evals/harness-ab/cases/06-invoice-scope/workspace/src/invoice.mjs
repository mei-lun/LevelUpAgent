export function invoiceTotal(items, discountPercent, taxRate) {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const tax = subtotal * taxRate;
  const discount = subtotal * (discountPercent / 100);
  return Math.round(subtotal + tax - discount);
}
