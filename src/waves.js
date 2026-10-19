/**
 * Swarm — Wave Spawner System
 * Controls escalating enemy compositions and off-screen spawn geometries.
 */

import { ENEMY_TYPES, GAME_W, GAME_H, WORLD_W, WORLD_H } from './constants.js';

export class WaveSpawner {
  constructor(enemyPool) {
    this.enemyPool = enemyPool;
    this.timer = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 0.55; // seconds between spawn bursts
  }

  reset() {
    this.timer = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 0.55;
  }

  update(player, dt) {
    this.timer += dt;
    this.spawnTimer -= dt;

    if (this.spawnTimer <= 0) {
      this.spawnTimer = this.spawnInterval;
      this.spawnWave(player);
    }
  }

  spawnWave(player) {
    const elapsed = this.timer;
    const hpMultiplier = 1.0 + (elapsed / 60) * 0.35; // HP scales gently over time

    // Number of enemies in this burst (scales with time)
    const burstCount = Math.min(6 + Math.floor(elapsed / 18) * 3, 28);

    // Dynamic wave composition
    let batChance = 0;
    let bruteChance = 0;

    if (elapsed > 45) batChance = 0.35;
    if (elapsed > 120) {
      batChance = 0.45;
      bruteChance = 0.12;
    }
    if (elapsed > 240) {
      batChance = 0.50;
      bruteChance = 0.20;
    }

    const spawnDist = Math.hypot(GAME_W, GAME_H) * 0.55 + 50;
    const baseAngle = Math.random() * Math.PI * 2;

    for (let i = 0; i < burstCount; i++) {
      const angle = baseAngle + (Math.random() - 0.5) * 1.2;
      const dist = spawnDist + Math.random() * 80;

      let sx = player.x + Math.cos(angle) * dist;
      let sy = player.y + Math.sin(angle) * dist;

      // Clamp spawn to within world margins
      sx = Math.max(30, Math.min(WORLD_W - 30, sx));
      sy = Math.max(30, Math.min(WORLD_H - 30, sy));

      let type = ENEMY_TYPES.BLOB;
      const roll = Math.random();
      if (roll < bruteChance) {
        type = ENEMY_TYPES.BRUTE;
      } else if (roll < bruteChance + batChance) {
        type = ENEMY_TYPES.BAT;
      }

      const enemy = this.enemyPool.alloc();
      if (enemy) {
        enemy.spawn(type, sx, sy, hpMultiplier);
      }
    }
  }

  /**
   * Instantly spawn an arbitrary swarm around the player for performance stress-testing.
   * @param {Object} player
   * @param {number} count Number of enemies to force-spawn
   */
  spawnStressSwarm(player, count = 600) {
    const spawnDist = Math.hypot(GAME_W, GAME_H) * 0.55;
    for (let i = 0; i < count; i++) {
      const enemy = this.enemyPool.alloc();
      if (!enemy) break;

      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const dist = spawnDist + (i % 6) * 45;

      let sx = player.x + Math.cos(angle) * dist;
      let sy = player.y + Math.sin(angle) * dist;
      sx = Math.max(30, Math.min(WORLD_W - 30, sx));
      sy = Math.max(30, Math.min(WORLD_H - 30, sy));

      const type = (i % 8 === 0) ? ENEMY_TYPES.BRUTE : ((i % 3 === 0) ? ENEMY_TYPES.BAT : ENEMY_TYPES.BLOB);
      enemy.spawn(type, sx, sy, 1.0);
    }
  }
}
