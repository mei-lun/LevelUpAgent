export class TtlCache {
  #entries = new Map();

  set(key, value, ttlMs, now = Date.now()) {
    if (!Number.isFinite(ttlMs) || ttlMs < 0) {
      throw new RangeError("ttlMs must be a non-negative finite number");
    }
    this.#entries.set(key, { value, expiresAt: now + ttlMs });
  }

  get(key, now = Date.now()) {
    const entry = this.#entries.get(key);
    if (!entry || !entry.value) return undefined;
    if (entry.expiresAt < now) {
      this.#entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  has(key, now = Date.now()) {
    return this.get(key, now) !== undefined;
  }

  get size() {
    return this.#entries.size;
  }
}
