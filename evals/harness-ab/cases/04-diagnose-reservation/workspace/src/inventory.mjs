export class Inventory {
  constructor(stock) {
    this.stock = new Map(Object.entries(stock));
    this.reservations = new Map();
  }

  async reserve(items) {
    for (const item of items) {
      if ((this.stock.get(item.sku) ?? 0) < item.quantity) {
        throw new Error(`Insufficient stock for ${item.sku}`);
      }
    }
    const id = `r-${this.reservations.size + 1}`;
    for (const item of items) {
      this.stock.set(item.sku, this.stock.get(item.sku) - item.quantity);
    }
    this.reservations.set(id, items);
    return { id, items };
  }

  async commit(id) {
    this.reservations.delete(id);
  }

  async release(id) {
    const items = this.reservations.get(id) ?? [];
    for (const item of items) {
      this.stock.set(item.sku, (this.stock.get(item.sku) ?? 0) + item.quantity);
    }
    this.reservations.delete(id);
  }
}
