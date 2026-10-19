/**
 * Swarm — Weapon System (Spark Bolt & Orbit Shields)
 * Zero-allocation projectile handling using shared Projectile Pool.
 */

import { WEAPON_TYPES, WORLD_W, WORLD_H } from './constants.js';

export class WeaponManager {
  constructor(projectilePool) {
    this.projectilePool = projectilePool;

    // Equipped weapons map: id -> weaponInstance
    this.weapons = {};

    // Total damage tracking per weapon for end-of-run chart
    this.damageStats = {
      [WEAPON_TYPES.SPARK_BOLT]: 0,
      [WEAPON_TYPES.ORBIT_SHIELDS]: 0
    };
  }

  reset() {
    this.weapons = {};
    this.damageStats[WEAPON_TYPES.SPARK_BOLT] = 0;
    this.damageStats[WEAPON_TYPES.ORBIT_SHIELDS] = 0;
  }

  addOrUpgradeWeapon(id) {
    if (!this.weapons[id]) {
      if (id === WEAPON_TYPES.SPARK_BOLT) {
        this.weapons[id] = new SparkBoltWeapon(this.projectilePool, this.damageStats);
      } else if (id === WEAPON_TYPES.ORBIT_SHIELDS) {
        this.weapons[id] = new OrbitShieldsWeapon(this.damageStats);
      }
    } else {
      this.weapons[id].upgrade();
    }
  }

  getWeapon(id) {
    return this.weapons[id] || null;
  }

  update(player, spatialHash, enemyPool, dt, onAudioSfx) {
    for (const id in this.weapons) {
      this.weapons[id].update(player, spatialHash, enemyPool, dt, onAudioSfx);
    }

    // Update active projectiles from pool
    this.updateProjectiles(dt, spatialHash, enemyPool, player, onAudioSfx);
  }

  updateProjectiles(dt, spatialHash, enemyPool, player, onAudioSfx) {
    const pool = this.projectilePool;
    const enemies = enemyPool.items;

    pool.forEachActive((proj) => {
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.life -= dt;

      // Despawn on timeout or out of bounds
      if (proj.life <= 0 || proj.x < 0 || proj.x > WORLD_W || proj.y < 0 || proj.y > WORLD_H) {
        pool.free(proj);
        return;
      }

      // Check collision with enemies via spatial hash
      const count = spatialHash.query(proj.x, proj.y, proj.radius + 20);
      for (let i = 0; i < count; i++) {
        const eIdx = spatialHash.queryBuffer[i];
        const enemy = enemies[eIdx];
        if (!enemy || !enemy.active) continue;

        // Check if this enemy was already pierced recently by this projectile
        if (proj.hitIds && proj.hitIds.has(enemy._poolIndex)) continue;

        const distSq = (proj.x - enemy.x) ** 2 + (proj.y - enemy.y) ** 2;
        const hitDist = proj.radius + enemy.radius;

        if (distSq <= hitDist * hitDist) {
          const dmg = Math.round(proj.damage * player.might);
          enemy.takeDamage(dmg, proj.vx, proj.vy);
          this.damageStats[proj.weaponId] = (this.damageStats[proj.weaponId] || 0) + dmg;
          player.totalDamageDealt += dmg;

          if (proj.hitIds) proj.hitIds.add(enemy._poolIndex);
          if (typeof onAudioSfx === 'function') onAudioSfx('hit');

          proj.pierce--;
          if (proj.pierce <= 0) {
            pool.free(proj);
            break;
          }
        }
      }
    });
  }
}

// -------------------------------------------------------------
// 1. Spark Bolt Weapon
// -------------------------------------------------------------
export class SparkBoltWeapon {
  constructor(projectilePool, damageStats) {
    this.id = WEAPON_TYPES.SPARK_BOLT;
    this.name = 'Spark Bolt';
    this.level = 1;
    this.maxLevel = 8;
    this.projectilePool = projectilePool;
    this.damageStats = damageStats;

    this.cooldown = 0.9;
    this.timer = 0;
    this.baseDamage = 24;
    this.baseSpeed = 430;
    this.pierce = 1;
    this.count = 1;
    this.range = 550;
  }

  upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;
    if (this.level === 2) this.count = 2;
    else if (this.level === 3) this.baseDamage += 8;
    else if (this.level === 4) this.cooldown *= 0.85;
    else if (this.level === 5) this.pierce += 1;
    else if (this.level === 6) this.count = 3;
    else if (this.level === 7) this.baseDamage += 12;
    else if (this.level === 8) {
      this.cooldown *= 0.8;
      this.pierce += 1;
    }
  }

  update(player, spatialHash, enemyPool, dt, onAudioSfx) {
    this.timer -= dt;
    if (this.timer > 0) return;

    // Find nearest enemy to target
    const target = spatialHash.findNearest(player.x, player.y, this.range, enemyPool);
    if (!target) return;

    this.timer = this.cooldown * player.cooldownMod;

    const baseAngle = Math.atan2(target.y - player.y, target.x - player.x);
    const speed = this.baseSpeed * player.projSpeedMod;
    const spread = 0.18; // rad spread for multiple bolts

    for (let i = 0; i < this.count; i++) {
      const proj = this.projectilePool.alloc();
      if (!proj) break;

      const offsetAngle = this.count > 1 ? (i - (this.count - 1) / 2) * spread : 0;
      const angle = baseAngle + offsetAngle;

      proj.weaponId = this.id;
      proj.x = player.x;
      proj.y = player.y;
      proj.vx = Math.cos(angle) * speed;
      proj.vy = Math.sin(angle) * speed;
      proj.damage = this.baseDamage;
      proj.radius = 7;
      proj.life = 1.4;
      proj.pierce = this.pierce;
      if (!proj.hitIds) proj.hitIds = new Set();
      else proj.hitIds.clear();
    }

    if (typeof onAudioSfx === 'function') onAudioSfx('spark_shoot');
  }
}

// -------------------------------------------------------------
// 2. Orbit Shields Weapon
// -------------------------------------------------------------
export class OrbitShieldsWeapon {
  constructor(damageStats) {
    this.id = WEAPON_TYPES.ORBIT_SHIELDS;
    this.name = 'Orbit Shields';
    this.level = 1;
    this.maxLevel = 8;
    this.damageStats = damageStats;

    this.count = 1;
    this.radius = 65;
    this.orbitSpeed = 3.4; // rad/s
    this.angle = 0;
    this.baseDamage = 16;
    this.shieldHitRadius = 14;

    // Pre-allocated coordinates for up to 8 orbit shields
    this.orbs = [];
    for (let i = 0; i < 8; i++) {
      this.orbs.push({ x: 0, y: 0 });
    }

    // Cooldown tracker per enemy pool index to prevent rapid multihits
    this.enemyCooldowns = new Float32Array(1200);
  }

  upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;
    if (this.level === 2) this.count = 2;
    else if (this.level === 3) this.baseDamage += 6;
    else if (this.level === 4) this.count = 3;
    else if (this.level === 5) this.radius += 12;
    else if (this.level === 6) this.orbitSpeed *= 1.25;
    else if (this.level === 7) this.count = 4;
    else if (this.level === 8) {
      this.count = 5;
      this.baseDamage += 10;
    }
  }

  update(player, spatialHash, enemyPool, dt, onAudioSfx) {
    this.angle += this.orbitSpeed * dt;
    if (this.angle > Math.PI * 2) this.angle -= Math.PI * 2;

    // Decay enemy hit cooldowns
    for (let i = 0; i < 1200; i++) {
      if (this.enemyCooldowns[i] > 0) {
        this.enemyCooldowns[i] -= dt;
      }
    }

    const orbCount = this.count;
    const currentRadius = this.radius * player.areaMod;
    const enemies = enemyPool.items;
    const dmg = Math.round(this.baseDamage * player.might);

    for (let i = 0; i < orbCount; i++) {
      const a = this.angle + (i * Math.PI * 2) / orbCount;
      const ox = player.x + Math.cos(a) * currentRadius;
      const oy = player.y + Math.sin(a) * currentRadius;

      this.orbs[i].x = ox;
      this.orbs[i].y = oy;

      // Check hits via spatial hash
      const count = spatialHash.query(ox, oy, this.shieldHitRadius + 18);
      for (let j = 0; j < count; j++) {
        const eIdx = spatialHash.queryBuffer[j];
        const enemy = enemies[eIdx];
        if (!enemy || !enemy.active) continue;

        if (this.enemyCooldowns[eIdx] <= 0) {
          const distSq = (ox - enemy.x) ** 2 + (oy - enemy.y) ** 2;
          const hitDist = this.shieldHitRadius + enemy.radius;
          if (distSq <= hitDist * hitDist) {
            const pushDirX = Math.cos(a);
            const pushDirY = Math.sin(a);
            enemy.takeDamage(dmg, pushDirX * 120, pushDirY * 120);
            this.enemyCooldowns[eIdx] = 0.38; // 380ms contact cooldown
            this.damageStats[this.id] = (this.damageStats[this.id] || 0) + dmg;
            player.totalDamageDealt += dmg;
            if (typeof onAudioSfx === 'function') onAudioSfx('hit');
          }
        }
      }
    }
  }
}
