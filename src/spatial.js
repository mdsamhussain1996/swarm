/**
 * Swarm — Uniform-Grid Spatial Hash
 * Fast O(1) broadphase collision, proximity queries, and boids-style separation.
 * Uses flat Int32Array linked lists for 100% zero runtime allocation.
 */

import { SPATIAL_CELL_SIZE, SPATIAL_COLS, SPATIAL_ROWS, WORLD_W, WORLD_H, MAX_ENEMIES } from './constants.js';

export class SpatialHash {
  constructor(cellSize = SPATIAL_CELL_SIZE, cols = SPATIAL_COLS, rows = SPATIAL_ROWS, maxEntities = MAX_ENEMIES) {
    this.cellSize = cellSize;
    this.cols = cols;
    this.rows = rows;
    this.maxEntities = maxEntities;

    // Head index for each grid cell (-1 represents empty)
    this.head = new Int32Array(cols * rows);
    this.head.fill(-1);

    // Linked list next pointer for each entity index
    this.next = new Int32Array(maxEntities);
    this.next.fill(-1);

    // Reusable query buffer to prevent array allocation
    this.queryBuffer = new Int32Array(maxEntities);
  }

  /**
   * Clear the spatial grid before rebuilding for the frame.
   */
  clear() {
    this.head.fill(-1);
  }

  /**
   * Insert an entity index into the spatial grid.
   * @param {number} entityIndex Pool index of the entity
   * @param {number} x
   * @param {number} y
   */
  insert(entityIndex, x, y) {
    if (entityIndex < 0 || entityIndex >= this.maxEntities) return;

    let cx = Math.floor(x / this.cellSize);
    let cy = Math.floor(y / this.cellSize);

    // Clamp to grid limits
    if (cx < 0) cx = 0;
    else if (cx >= this.cols) cx = this.cols - 1;
    if (cy < 0) cy = 0;
    else if (cy >= this.rows) cy = this.rows - 1;

    const cellIdx = cy * this.cols + cx;
    this.next[entityIndex] = this.head[cellIdx];
    this.head[cellIdx] = entityIndex;
  }

  /**
   * Query entities within a circular radius.
   * Populates this.queryBuffer and returns the number of matches.
   * Zero heap allocations.
   * @param {number} x
   * @param {number} y
   * @param {number} radius
   * @returns {number} Count of found entities in this.queryBuffer
   */
  query(x, y, radius) {
    let count = 0;
    const cs = this.cellSize;
    const minCx = Math.max(0, Math.floor((x - radius) / cs));
    const maxCx = Math.min(this.cols - 1, Math.floor((x + radius) / cs));
    const minCy = Math.max(0, Math.floor((y - radius) / cs));
    const maxCy = Math.min(this.rows - 1, Math.floor((y + radius) / cs));

    const r2 = radius * radius;
    const head = this.head;
    const next = this.next;
    const cols = this.cols;
    const qb = this.queryBuffer;

    for (let cy = minCy; cy <= maxCy; cy++) {
      const rowOffset = cy * cols;
      for (let cx = minCx; cx <= maxCx; cx++) {
        let curr = head[rowOffset + cx];
        while (curr !== -1) {
          qb[count++] = curr;
          curr = next[curr];
        }
      }
    }
    return count;
  }

  /**
   * Find the nearest active enemy to a target point.
   * Expands outward from the target cell.
   * @param {number} tx
   * @param {number} ty
   * @param {number} maxRadius
   * @param {Object} enemyPool
   * @returns {Object|null}
   */
  findNearest(tx, ty, maxRadius, enemyPool) {
    const cs = this.cellSize;
    const maxCells = Math.ceil(maxRadius / cs);
    const centerCx = Math.floor(tx / cs);
    const centerCy = Math.floor(ty / cs);

    let nearestEnemy = null;
    let nearestDistSq = maxRadius * maxRadius;

    const minCx = Math.max(0, centerCx - maxCells);
    const maxCx = Math.min(this.cols - 1, centerCx + maxCells);
    const minCy = Math.max(0, centerCy - maxCells);
    const maxCy = Math.min(this.rows - 1, centerCy + maxCells);

    const head = this.head;
    const next = this.next;
    const cols = this.cols;
    const enemies = enemyPool.items;

    for (let cy = minCy; cy <= maxCy; cy++) {
      const rowOffset = cy * cols;
      for (let cx = minCx; cx <= maxCx; cx++) {
        let curr = head[rowOffset + cx];
        while (curr !== -1) {
          const enemy = enemies[curr];
          if (enemy && enemy.active) {
            const dx = enemy.x - tx;
            const dy = enemy.y - ty;
            const distSq = dx * dx + dy * dy;
            if (distSq < nearestDistSq) {
              nearestDistSq = distSq;
              nearestEnemy = enemy;
            }
          }
          curr = next[curr];
        }
      }
    }
    return nearestEnemy;
  }

  /**
   * Apply lightweight boids-style separation among active enemies.
   * Runs in O(N * k) where k is local neighbors (~5-15) instead of O(N^2).
   * @param {Object} enemyPool
   * @param {number} dt
   */
  applySeparation(enemyPool, dt) {
    const enemies = enemyPool.items;
    const count = enemyPool.capacity;
    const cs = this.cellSize;
    const cols = this.cols;
    const rows = this.rows;
    const head = this.head;
    const next = this.next;

    for (let i = 0; i < count; i++) {
      const e1 = enemies[i];
      if (!e1.active) continue;

      const cx = Math.floor(e1.x / cs);
      const cy = Math.floor(e1.y / cs);

      const minCx = Math.max(0, cx - 1);
      const maxCx = Math.min(cols - 1, cx + 1);
      const minCy = Math.max(0, cy - 1);
      const maxCy = Math.min(rows - 1, cy + 1);

      let sepX = 0;
      let sepY = 0;

      for (let ncy = minCy; ncy <= maxCy; ncy++) {
        const rowOffset = ncy * cols;
        for (let ncx = minCx; ncx <= maxCx; ncx++) {
          let curr = head[rowOffset + ncx];
          while (curr !== -1) {
            if (curr !== i) {
              const e2 = enemies[curr];
              if (e2 && e2.active) {
                const dx = e1.x - e2.x;
                const dy = e1.y - e2.y;
                const minD = e1.radius + e2.radius;
                const distSq = dx * dx + dy * dy;
                if (distSq > 0.001 && distSq < minD * minD) {
                  const dist = Math.sqrt(distSq);
                  const overlap = (minD - dist) / dist;
                  sepX += dx * overlap * 0.5;
                  sepY += dy * overlap * 0.5;
                }
              }
            }
            curr = next[curr];
          }
        }
      }

      // Nudge position slightly
      if (sepX !== 0 || sepY !== 0) {
        e1.x += sepX * (dt * 12);
        e1.y += sepY * (dt * 12);
      }
    }
  }
}
