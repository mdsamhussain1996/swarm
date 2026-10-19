/**
 * Swarm — Enemy Entities (Blob, Bat, Brute)
 * Optimized for pooling and fast spatial-hash separation.
 */

import { ENEMY_TYPES, GEM_TYPES, WORLD_W, WORLD_H } from './constants.js';

export class Enemy {
  constructor(poolIndex = 0) {
    this._poolIndex = poolIndex;
    this.active = false;

    this.type = ENEMY_TYPES.BLOB;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.speed = 80;
    this.radius = 12;
    this.maxHp = 25;
    this.hp = 25;
    this.damage = 10;
    this.gemType = GEM_TYPES.BLUE;

    this.hitFlashTimer = 0;
    this.knockX = 0;
    this.knockY = 0;
    this.animTimer = Math.random() * 10;
  }

  /**
   * Initialize enemy when drawn from pool.
   */
  spawn(type, x, y, hpMultiplier = 1.0) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.knockX = 0;
    this.knockY = 0;
    this.hitFlashTimer = 0;
    this.animTimer = Math.random() * 10;

    if (type === ENEMY_TYPES.BLOB) {
      this.radius = 12;
      this.speed = 80 + Math.random() * 15;
      this.maxHp = Math.round(25 * hpMultiplier);
      this.damage = 10;
      this.gemType = GEM_TYPES.BLUE;
    } else if (type === ENEMY_TYPES.BAT) {
      this.radius = 10;
      this.speed = 145 + Math.random() * 20;
      this.maxHp = Math.round(14 * hpMultiplier);
      this.damage = 7;
      this.gemType = GEM_TYPES.BLUE;
    } else if (type === ENEMY_TYPES.BRUTE) {
      this.radius = 22;
      this.speed = 52 + Math.random() * 8;
      this.maxHp = Math.round(140 * hpMultiplier);
      this.damage = 24;
      this.gemType = Math.random() < 0.25 ? GEM_TYPES.PURPLE : GEM_TYPES.GREEN;
    }
    this.hp = this.maxHp;
  }

  takeDamage(amount, knockDirX = 0, knockDirY = 0) {
    this.hp -= amount;
    this.hitFlashTimer = 0.08; // 80ms bright flash

    // Apply knockback (Brutes have high mass, so lower knockback)
    const mass = this.type === ENEMY_TYPES.BRUTE ? 3.0 : 1.0;
    const mag = Math.hypot(knockDirX, knockDirY);
    if (mag > 0.001) {
      const force = 160 / mass;
      this.knockX += (knockDirX / mag) * force;
      this.knockY += (knockDirY / mag) * force;
    }
  }

  update(player, dt) {
    this.animTimer += dt;
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

    // Knockback decay
    this.knockX *= Math.pow(0.05, dt);
    this.knockY *= Math.pow(0.05, dt);

    // Direction to player
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 1.0) {
      const dirX = dx / dist;
      const dirY = dy / dist;
      this.vx = dirX * this.speed + this.knockX;
      this.vy = dirY * this.speed + this.knockY;
    } else {
      this.vx = this.knockX;
      this.vy = this.knockY;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Bounds clamp
    const r = this.radius;
    if (this.x < r) this.x = r;
    else if (this.x > WORLD_W - r) this.x = WORLD_W - r;
    if (this.y < r) this.y = r;
    else if (this.y > WORLD_H - r) this.y = WORLD_H - r;
  }
}
