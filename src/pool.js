/**
 * Swarm — Zero-Allocation Object Pool
 * Pre-allocates fixed capacity buffers to eliminate garbage collection pauses.
 */

export class Pool {
  /**
   * @param {Function} factory Creates a single pre-allocated entity
   * @param {number} capacity Maximum instances to pre-allocate
   * @param {string} [name='pool'] Identifier for diagnostics
   */
  constructor(factory, capacity, name = 'pool') {
    this.name = name;
    this.capacity = capacity;
    this.items = new Array(capacity);
    this.freeStack = new Int32Array(capacity);
    this.freeCount = capacity;
    this.activeCount = 0;

    // Pre-allocate all items
    for (let i = 0; i < capacity; i++) {
      const item = factory(i);
      item._poolIndex = i;
      item.active = false;
      this.items[i] = item;
      this.freeStack[i] = capacity - 1 - i; // LIFO order
    }

    // Diagnostics
    this.allocationsSinceReset = 0;
  }

  /**
   * Retrieve an available item from the pool.
   * Zero heap allocations during execution.
   * @returns {Object|null}
   */
  alloc() {
    if (this.freeCount <= 0) {
      return null;
    }
    this.freeCount--;
    const idx = this.freeStack[this.freeCount];
    const item = this.items[idx];
    item.active = true;
    this.activeCount++;
    this.allocationsSinceReset++;
    return item;
  }

  /**
   * Release an active item back to the pool.
   * @param {Object} item
   */
  free(item) {
    if (!item.active) return;
    item.active = false;
    this.freeStack[this.freeCount] = item._poolIndex;
    this.freeCount++;
    this.activeCount--;
  }

  /**
   * Iterate over all active items without allocating arrays.
   * @param {Function} fn (item, index) => void
   */
  forEachActive(fn) {
    const items = this.items;
    const len = this.capacity;
    for (let i = 0; i < len; i++) {
      const item = items[i];
      if (item.active) {
        fn(item, i);
      }
    }
  }

  /**
   * Reset all items to inactive state.
   */
  reset() {
    this.freeCount = this.capacity;
    this.activeCount = 0;
    this.allocationsSinceReset = 0;
    for (let i = 0; i < this.capacity; i++) {
      this.items[i].active = false;
      this.freeStack[i] = this.capacity - 1 - i;
    }
  }
}
