/**
 * Swarm — Game Core Engine
 * Fixed 60Hz timestep loop, zero-allocation pooling, spatial broadphase, and state machine.
 */

import { FIXED_DT, MAX_ENEMIES, MAX_PROJECTILES, MAX_GEMS, WEAPON_TYPES } from './constants.js';
import { Pool } from './pool.js';
import { SpatialHash } from './spatial.js';
import { Player } from './player.js';
import { Enemy } from './enemies.js';
import { Gem } from './pickups.js';
import { WeaponManager } from './weapons.js';
import { WaveSpawner } from './waves.js';
import { UpgradeSystem } from './upgrades.js';
import { ParticleManager } from './particles.js';
import { AudioManager } from './audio.js';
import { Input } from './input.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;

    // Zero-Allocation Pools
    this.enemyPool = new Pool((idx) => new Enemy(idx), MAX_ENEMIES, 'enemies');
    this.gemPool = new Pool((idx) => new Gem(idx), MAX_GEMS, 'gems');
    this.projectilePool = new Pool(() => ({
      active: false,
      weaponId: '',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      damage: 0,
      radius: 6,
      life: 0,
      pierce: 1,
      hitIds: new Set()
    }), MAX_PROJECTILES, 'projectiles');

    // Systems
    this.spatialHash = new SpatialHash();
    this.player = new Player();
    this.weaponManager = new WeaponManager(this.projectilePool);
    this.waveSpawner = new WaveSpawner(this.enemyPool);
    this.upgradeSystem = new UpgradeSystem();
    this.particleManager = new ParticleManager();
    this.audio = new AudioManager();
    this.input = new Input(canvas);

    // Game State: 'title', 'playing', 'levelup', 'paused', 'results'
    this.state = 'title';
    this.runTimer = 0;
    this.totalKills = 0;

    // Performance diagnostics
    this.fps = 60;
    this.fpsTimer = 0;
    this.frameCount = 0;

    // Hook pause
    this.input.onPause = () => this.togglePause();
  }

  showTitle() {
    this.state = 'title';
    if (this.ui) this.ui.showScreen('title');
  }

  startRun() {
    this.state = 'playing';
    this.runTimer = 0;
    this.totalKills = 0;

    // Reset entities and systems
    this.enemyPool.reset();
    this.gemPool.reset();
    this.projectilePool.reset();
    this.particleManager.reset();
    this.upgradeSystem.reset();
    this.waveSpawner.reset();
    this.weaponManager.reset();
    this.player.reset();

    // Nova starts with Spark Bolt
    this.weaponManager.addOrUpgradeWeapon(WEAPON_TYPES.SPARK_BOLT);

    if (this.ui) {
      this.ui.showScreen('playing');
      this.ui.updateHud(this.player, this.runTimer, this.totalKills);
    }
  }

  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      if (this.ui) this.ui.showScreen('paused');
    } else if (this.state === 'paused') {
      this.state = 'playing';
      if (this.ui) this.ui.showScreen('playing');
    }
  }

  triggerLevelUp() {
    this.state = 'levelup';
    this.audio.playSfx('level_up');
    const choices = this.upgradeSystem.generateChoices(this.player, this.weaponManager);
    if (this.ui) {
      this.ui.showLevelUp(choices);
    }
  }

  rerollUpgrades() {
    if (this.upgradeSystem.rerollsRemaining > 0) {
      this.upgradeSystem.rerollsRemaining--;
      const choices = this.upgradeSystem.generateChoices(this.player, this.weaponManager);
      if (this.ui) {
        this.ui.showLevelUp(choices);
      }
    }
  }

  skipUpgrades() {
    if (this.upgradeSystem.skipsRemaining > 0) {
      this.upgradeSystem.skipsRemaining--;
      this.resumeAfterLevelUp();
    }
  }

  resumeAfterLevelUp() {
    this.state = 'playing';
    if (this.ui) {
      this.ui.showScreen('playing');
      this.ui.updateHud(this.player, this.runTimer, this.totalKills);
    }
  }

  handleGameOver() {
    this.state = 'results';
    this.audio.playSfx('die');
    if (this.ui) {
      this.ui.showResults(this.player, this.runTimer);
    }
  }

  /**
   * Fixed physics step execution.
   * @param {number} dt Fixed timestep (1/60s)
   */
  fixedUpdate(dt) {
    if (this.state !== 'playing') return;

    this.runTimer += dt;
    this.audio.update(dt);
    this.input.update();

    // 1. Player Movement & State
    this.player.update(this.input, dt);

    // 2. Clear & Populate Spatial Hash with active enemies
    this.spatialHash.clear();
    const enemies = this.enemyPool.items;
    const enemyCap = this.enemyPool.capacity;
    for (let i = 0; i < enemyCap; i++) {
      const e = enemies[i];
      if (e.active) {
        this.spatialHash.insert(i, e.x, e.y);
      }
    }

    // 3. Cheap boids-style separation among enemies via spatial hash
    this.spatialHash.applySeparation(this.enemyPool, dt);

    // 4. Wave Spawner
    this.waveSpawner.update(this.player, dt);

    // 5. Weapons & Projectiles
    this.weaponManager.update(
      this.player,
      this.spatialHash,
      this.enemyPool,
      dt,
      (sfx) => this.audio.playSfx(sfx)
    );

    // 6. Enemies update & player collision check
    const p = this.player;
    const hitRadiusSq = (p.radius + 10) ** 2;

    this.enemyPool.forEachActive((enemy) => {
      enemy.update(p, dt);

      // Check collision with player
      const distSq = (enemy.x - p.x) ** 2 + (enemy.y - p.y) ** 2;
      if (distSq <= hitRadiusSq) {
        if (p.takeDamage(enemy.damage)) {
          this.audio.playSfx('hurt');
          this.particleManager.spawnBurst(p.x, p.y, 10, '#ef4444', 90);
          if (p.hp <= 0) {
            this.handleGameOver();
            return;
          }
        }
      }

      // Check enemy death
      if (enemy.hp <= 0) {
        this.totalKills++;
        p.totalKills++;

        // Drop XP gem
        const gem = this.gemPool.alloc();
        if (gem) {
          gem.spawn(enemy.x, enemy.y, enemy.gemType);
        }

        // Death particle burst
        this.particleManager.spawnBurst(enemy.x, enemy.y, 6, enemy.gemType.color, 70);

        // Recycle enemy
        this.enemyPool.free(enemy);
      }
    });

    if (this.state !== 'playing') return;

    // 7. Pickups & XP Gems magnet and collection
    let levelsGained = 0;
    this.gemPool.forEachActive((gem) => {
      const dist = gem.update(p, dt);
      if (dist <= p.radius + 8) {
        const lvls = p.addXp(gem.gemType.value);
        levelsGained += lvls;
        this.audio.playSfx('gem');
        this.gemPool.free(gem);
      }
    });

    // 8. Particles & Damage Numbers
    this.particleManager.update(dt);

    // 9. Check Level Up
    if (levelsGained > 0) {
      this.triggerLevelUp();
      return;
    }

    // 10. Update HUD
    if (this.ui) {
      this.ui.updateHud(p, this.runTimer, this.totalKills);
    }
  }

  /**
   * Main game tick with frame rate diagnostics.
   * @param {number} dt Delta time in seconds
   */
  tick(dt) {
    // FPS measurement
    this.frameCount++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 1.0) {
      this.fps = Math.round((this.frameCount / this.fpsTimer) * 10) / 10;
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    // Fixed timestep execution
    this.fixedUpdate(FIXED_DT);
  }
}
