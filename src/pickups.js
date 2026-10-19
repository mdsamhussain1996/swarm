/**
 * Swarm — Pickups (XP Gems)
 * Fast zero-allocation gems with magnetic attraction to player.
 */

import { GEM_TYPES } from './constants.js';

export class Gem {
  constructor(poolIndex = 0) {
    this._poolIndex = poolIndex;
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.gemType = GEM_TYPES.BLUE;
    this.attracted = false;
    this.magnetSpeed = 260;
  }

  spawn(x, y, gemType = GEM_TYPES.BLUE) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 40;
    this.vy = (Math.random() - 0.5) * 40;
    this.gemType = gemType;
    this.attracted = false;
    this.magnetSpeed = 260;
  }

  update(player, dt) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    // Initial scatter deceleration
    if (!this.attracted) {
      this.vx *= 0.92;
      this.vy *= 0.92;
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      if (dist < player.pickupRadius) {
        this.attracted = true;
      }
    } else {
      // Magnetic pull accelerating towards player
      this.magnetSpeed += 650 * dt;
      if (dist > 0.001) {
        this.vx = (dx / dist) * this.magnetSpeed;
        this.vy = (dy / dist) * this.magnetSpeed;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
      }
    }

    return dist;
  }
}
