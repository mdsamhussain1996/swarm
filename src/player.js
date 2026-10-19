/**
 * Swarm — Player Entity (Hero: Nova)
 * Starting weapon: Spark Bolt (+10% projectile speed passive)
 */

import { WORLD_W, WORLD_H } from './constants.js';

export class Player {
  constructor(x = WORLD_W / 2, y = WORLD_H / 2) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 14;
    this.facing = 1; // 1 = right, -1 = left

    // Hero: Nova Stats
    this.heroName = 'Nova';
    this.maxHp = 100;
    this.hp = 100;
    this.speed = 210;
    this.might = 1.0;
    this.armor = 0;
    this.pickupRadius = 85;
    this.projSpeedMod = 1.10; // Nova passive: +10% projectile speed
    this.areaMod = 1.0;
    this.cooldownMod = 1.0;

    // Progression
    this.level = 1;
    this.xp = 0;
    this.xpToNext = 5;
    this.totalGemsCollected = 0;
    this.totalKills = 0;
    this.totalDamageDealt = 0;

    // Timers & Visuals
    this.invulnerableTimer = 0;
    this.flashTimer = 0;
    this.walkTimer = 0;
    this.isMoving = false;
  }

  reset(x = WORLD_W / 2, y = WORLD_H / 2) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;

    this.maxHp = 100;
    this.hp = 100;
    this.speed = 210;
    this.might = 1.0;
    this.armor = 0;
    this.pickupRadius = 85;
    this.projSpeedMod = 1.10;
    this.areaMod = 1.0;
    this.cooldownMod = 1.0;

    this.level = 1;
    this.xp = 0;
    this.xpToNext = 5;
    this.totalGemsCollected = 0;
    this.totalKills = 0;
    this.totalDamageDealt = 0;

    this.invulnerableTimer = 0;
    this.flashTimer = 0;
    this.walkTimer = 0;
    this.isMoving = false;
  }

  /**
   * Apply damage to player, accounting for armor and i-frames.
   * @param {number} rawDmg
   * @returns {boolean} True if damage was taken
   */
  takeDamage(rawDmg) {
    if (this.invulnerableTimer > 0 || this.hp <= 0) return false;

    const actualDmg = Math.max(1, Math.round(rawDmg - this.armor));
    this.hp -= actualDmg;
    this.invulnerableTimer = 0.4; // 400ms i-frame
    this.flashTimer = 0.15;
    return true;
  }

  /**
   * Heal player without exceeding max HP.
   * @param {number} amount
   */
  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  /**
   * Add XP from collected gems.
   * @param {number} amount
   * @returns {number} Count of levels gained (usually 1, can be multiple)
   */
  addXp(amount) {
    this.xp += amount;
    this.totalGemsCollected++;
    let levelsGained = 0;

    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      levelsGained++;
      // Smooth geometric curve for XP scaling
      this.xpToNext = Math.floor(5 + Math.pow(this.level, 1.45) * 4);
    }
    return levelsGained;
  }

  update(input, dt) {
    // Timers
    if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;
    if (this.flashTimer > 0) this.flashTimer -= dt;

    // Movement
    const dirX = input.dirX;
    const dirY = input.dirY;
    this.isMoving = (dirX !== 0 || dirY !== 0);

    if (this.isMoving) {
      this.vx = dirX * this.speed;
      this.vy = dirY * this.speed;
      if (dirX < 0) this.facing = -1;
      else if (dirX > 0) this.facing = 1;
      this.walkTimer += dt * 10;
    } else {
      this.vx = 0;
      this.vy = 0;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Arena boundary clamp
    const r = this.radius;
    if (this.x < r) this.x = r;
    else if (this.x > WORLD_W - r) this.x = WORLD_W - r;
    if (this.y < r) this.y = r;
    else if (this.y > WORLD_H - r) this.y = WORLD_H - r;
  }
}
