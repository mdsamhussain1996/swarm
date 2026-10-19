/**
 * Swarm — Upgrade Cards & Level-Up Generator
 * Provides 3 distinct upgrade cards per level-up with Reroll and Skip mechanics.
 */

import { WEAPON_TYPES } from './constants.js';

export const PASSIVE_TYPES = {
  SPEED: 'passive_speed',
  ARMOR: 'passive_armor',
  MAX_HP: 'passive_max_hp',
  MAGNET: 'passive_magnet',
  MIGHT: 'passive_might'
};

export class UpgradeSystem {
  constructor() {
    this.rerollsRemaining = 1;
    this.skipsRemaining = 1;
    this.passiveLevels = {
      [PASSIVE_TYPES.SPEED]: 0,
      [PASSIVE_TYPES.ARMOR]: 0,
      [PASSIVE_TYPES.MAX_HP]: 0,
      [PASSIVE_TYPES.MAGNET]: 0,
      [PASSIVE_TYPES.MIGHT]: 0
    };
  }

  reset() {
    this.rerollsRemaining = 1;
    this.skipsRemaining = 1;
    for (const key in this.passiveLevels) {
      this.passiveLevels[key] = 0;
    }
  }

  /**
   * Roll 3 unique available upgrade options.
   * Never offers a maxed weapon/passive.
   * @param {Object} player
   * @param {Object} weaponManager
   * @returns {Array} Array of 3 upgrade card objects
   */
  generateChoices(player, weaponManager) {
    const pool = [];

    // 1. Weapons
    const spark = weaponManager.getWeapon(WEAPON_TYPES.SPARK_BOLT);
    if (!spark) {
      pool.push({
        id: WEAPON_TYPES.SPARK_BOLT,
        type: 'weapon',
        name: 'Spark Bolt',
        icon: '⚡',
        isNew: true,
        level: 1,
        maxLevel: 8,
        description: 'Fires an energetic bolt at the nearest enemy',
        apply: () => weaponManager.addOrUpgradeWeapon(WEAPON_TYPES.SPARK_BOLT)
      });
    } else if (spark.level < spark.maxLevel) {
      const nextLvl = spark.level + 1;
      let desc = '+8 Damage';
      if (nextLvl === 2 || nextLvl === 6) desc = '+1 Projectile';
      else if (nextLvl === 4 || nextLvl === 8) desc = '-15% Cooldown';
      else if (nextLvl === 5) desc = '+1 Pierce';

      pool.push({
        id: WEAPON_TYPES.SPARK_BOLT,
        type: 'weapon',
        name: 'Spark Bolt',
        icon: '⚡',
        isNew: false,
        level: nextLvl,
        maxLevel: 8,
        description: desc,
        apply: () => spark.upgrade()
      });
    }

    const orbit = weaponManager.getWeapon(WEAPON_TYPES.ORBIT_SHIELDS);
    if (!orbit) {
      pool.push({
        id: WEAPON_TYPES.ORBIT_SHIELDS,
        type: 'weapon',
        name: 'Orbit Shields',
        icon: '🛡️',
        isNew: true,
        level: 1,
        maxLevel: 8,
        description: 'Orbs circle around the hero, repelling foes',
        apply: () => weaponManager.addOrUpgradeWeapon(WEAPON_TYPES.ORBIT_SHIELDS)
      });
    } else if (orbit.level < orbit.maxLevel) {
      const nextLvl = orbit.level + 1;
      let desc = '+1 Shield Orb';
      if (nextLvl === 3 || nextLvl === 8) desc = '+6 Contact Damage';
      else if (nextLvl === 5) desc = '+15% Orbit Radius';
      else if (nextLvl === 6) desc = '+25% Orbit Speed';

      pool.push({
        id: WEAPON_TYPES.ORBIT_SHIELDS,
        type: 'weapon',
        name: 'Orbit Shields',
        icon: '🛡️',
        isNew: false,
        level: nextLvl,
        maxLevel: 8,
        description: desc,
        apply: () => orbit.upgrade()
      });
    }

    // 2. Passives (Max Level 5 each)
    const passives = [
      {
        id: PASSIVE_TYPES.MIGHT,
        name: 'Force Focus',
        icon: '💥',
        desc: '+15% All Damage',
        apply: () => { player.might += 0.15; }
      },
      {
        id: PASSIVE_TYPES.SPEED,
        name: 'Quick Foot',
        icon: '👟',
        desc: '+12% Movement Speed',
        apply: () => { player.speed *= 1.12; }
      },
      {
        id: PASSIVE_TYPES.ARMOR,
        name: 'Iron Shell',
        icon: '🛡️',
        desc: '+1 Damage Reduction',
        apply: () => { player.armor += 1; }
      },
      {
        id: PASSIVE_TYPES.MAGNET,
        name: 'Magnetic Charm',
        icon: '🧲',
        desc: '+30% Pickup Radius',
        apply: () => { player.pickupRadius *= 1.30; }
      },
      {
        id: PASSIVE_TYPES.MAX_HP,
        name: 'Vitality Surge',
        icon: '❤️',
        desc: '+25 Max HP & Full Heal',
        apply: () => { player.maxHp += 25; player.heal(player.maxHp); }
      }
    ];

    for (const p of passives) {
      const curLvl = this.passiveLevels[p.id];
      if (curLvl < 5) {
        pool.push({
          id: p.id,
          type: 'passive',
          name: p.name,
          icon: p.icon,
          isNew: curLvl === 0,
          level: curLvl + 1,
          maxLevel: 5,
          description: p.desc,
          apply: () => {
            this.passiveLevels[p.id]++;
            p.apply();
          }
        });
      }
    }

    // Shuffle pool
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // Take up to 3 choices
    return pool.slice(0, 3);
  }
}
