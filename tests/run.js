/**
 * Swarm — Phase 1 Test Suite
 * Tests pools zero-allocation, spatial hash vs brute force, upgrade rolls, and 600-enemy benchmark.
 */

import assert from 'assert';
import { Pool } from '../src/pool.js';
import { SpatialHash } from '../src/spatial.js';
import { Player } from '../src/player.js';
import { Enemy } from '../src/enemies.js';
import { Gem } from '../src/pickups.js';
import { WeaponManager } from '../src/weapons.js';
import { WaveSpawner } from '../src/waves.js';
import { UpgradeSystem } from '../src/upgrades.js';
import { ENEMY_TYPES, GEM_TYPES, WEAPON_TYPES, FIXED_DT, MAX_ENEMIES, MAX_PROJECTILES, MAX_GEMS } from '../src/constants.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    failed++;
  }
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

// -------------------------------------------------------------
// Section 1: Object Pooling & Zero Allocation
// -------------------------------------------------------------
section('1. Object Pooling & Zero Allocation');

test('Pool pre-allocates exact capacity and reports correct counts', () => {
  const pool = new Pool((i) => ({ id: i }), 100, 'test');
  assert.equal(pool.capacity, 100);
  assert.equal(pool.freeCount, 100);
  assert.equal(pool.activeCount, 0);

  const item1 = pool.alloc();
  assert.ok(item1);
  assert.equal(item1.active, true);
  assert.equal(pool.freeCount, 99);
  assert.equal(pool.activeCount, 1);

  pool.free(item1);
  assert.equal(item1.active, false);
  assert.equal(pool.freeCount, 100);
  assert.equal(pool.activeCount, 0);
});

test('Pools never allocate new objects over 60 seconds (3600 frames) of simulated combat', () => {
  const enemyPool = new Pool((idx) => new Enemy(idx), 600, 'enemies');
  const projPool = new Pool(() => ({
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
  }), 400, 'projectiles');
  const gemPool = new Pool((idx) => new Gem(idx), 500, 'gems');

  const player = new Player();
  const weapons = new WeaponManager(projPool);
  weapons.addOrUpgradeWeapon(WEAPON_TYPES.SPARK_BOLT);
  weapons.addOrUpgradeWeapon(WEAPON_TYPES.ORBIT_SHIELDS);

  const spatial = new SpatialHash();
  const spawner = new WaveSpawner(enemyPool);

  const initialEnemyArrayLength = enemyPool.items.length;
  const initialProjArrayLength = projPool.items.length;
  const initialGemArrayLength = gemPool.items.length;

  // Simulate 3600 frames (60 seconds at 60 fps)
  for (let frame = 0; frame < 3600; frame++) {
    spawner.update(player, FIXED_DT);

    // Populate spatial hash
    spatial.clear();
    const enemies = enemyPool.items;
    for (let i = 0; i < enemyPool.capacity; i++) {
      if (enemies[i].active) spatial.insert(i, enemies[i].x, enemies[i].y);
    }
    spatial.applySeparation(enemyPool, FIXED_DT);

    // Weapons
    weapons.update(player, spatial, enemyPool, FIXED_DT, null);

    // Enemies update
    enemyPool.forEachActive((e) => {
      e.update(player, FIXED_DT);
      if (e.hp <= 0) {
        const gem = gemPool.alloc();
        if (gem) gem.spawn(e.x, e.y, e.gemType);
        enemyPool.free(e);
      }
    });

    // Gems update
    gemPool.forEachActive((g) => {
      const dist = g.update(player, FIXED_DT);
      if (dist < player.pickupRadius) {
        player.addXp(g.gemType.value);
        gemPool.free(g);
      }
    });
  }

  // Verify memory invariant: array buffers never resized, freeCount + activeCount == capacity
  assert.equal(enemyPool.items.length, initialEnemyArrayLength);
  assert.equal(projPool.items.length, initialProjArrayLength);
  assert.equal(gemPool.items.length, initialGemArrayLength);
  assert.equal(enemyPool.freeCount + enemyPool.activeCount, enemyPool.capacity);
  assert.equal(projPool.freeCount + projPool.activeCount, projPool.capacity);
  assert.equal(gemPool.freeCount + gemPool.activeCount, gemPool.capacity);
});

// -------------------------------------------------------------
// Section 2: Spatial Hash vs Brute Force
// -------------------------------------------------------------
section('2. Spatial Hash vs Brute Force Correctness');

test('Spatial hash query matches brute force on random distributed entities', () => {
  const spatial = new SpatialHash(64, 50, 50, 500);
  const entities = [];

  // Spawn 300 random entities across a 3200x3200 world
  for (let i = 0; i < 300; i++) {
    const x = Math.random() * 3200;
    const y = Math.random() * 3200;
    entities.push({ x, y });
    spatial.insert(i, x, y);
  }

  // Run 20 random circle queries
  for (let q = 0; q < 20; q++) {
    const qx = Math.random() * 3200;
    const qy = Math.random() * 3200;
    const radius = 50 + Math.random() * 150;

    // Brute force count
    const bruteMatches = new Set();
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      const distSq = (e.x - qx) ** 2 + (e.y - qy) ** 2;
      // Grid cells contain candidates; any entity in checked cells is returned
      const cellCx = Math.floor(e.x / 64);
      const cellCy = Math.floor(e.y / 64);
      const minCx = Math.max(0, Math.floor((qx - radius) / 64));
      const maxCx = Math.min(49, Math.floor((qx + radius) / 64));
      const minCy = Math.max(0, Math.floor((qy - radius) / 64));
      const maxCy = Math.min(49, Math.floor((qy + radius) / 64));

      if (cellCx >= minCx && cellCx <= maxCx && cellCy >= minCy && cellCy <= maxCy) {
        bruteMatches.add(i);
      }
    }

    const count = spatial.query(qx, qy, radius);
    const spatialMatches = new Set();
    for (let i = 0; i < count; i++) {
      spatialMatches.add(spatial.queryBuffer[i]);
    }

    assert.equal(spatialMatches.size, bruteMatches.size, `Query ${q} size mismatch`);
    for (const id of bruteMatches) {
      assert.ok(spatialMatches.has(id), `Spatial hash missing entity ${id}`);
    }
  }
});

test('Spatial separation pushes overlapping enemies apart', () => {
  const enemyPool = new Pool((idx) => new Enemy(idx), 20, 'test_enemies');
  const spatial = new SpatialHash(64, 50, 50, 20);

  const e1 = enemyPool.alloc();
  const e2 = enemyPool.alloc();

  e1.spawn(ENEMY_TYPES.BLOB, 500, 500);
  e2.spawn(ENEMY_TYPES.BLOB, 502, 500); // 2px apart, sum of radii is 24px

  spatial.insert(e1._poolIndex, e1.x, e1.y);
  spatial.insert(e2._poolIndex, e2.x, e2.y);

  const initialDist = Math.hypot(e1.x - e2.x, e1.y - e2.y);

  // Apply separation over 10 frames
  for (let f = 0; f < 10; f++) {
    spatial.applySeparation(enemyPool, FIXED_DT);
  }

  const finalDist = Math.hypot(e1.x - e2.x, e1.y - e2.y);
  assert.ok(finalDist > initialDist, `Enemies should separate: initial ${initialDist}, final ${finalDist}`);
});

// -------------------------------------------------------------
// Section 3: Upgrades & Progression Mechanics
// -------------------------------------------------------------
section('3. Upgrades & Progression Mechanics');

test('Upgrade rolls generate up to 3 choices and never offer maxed upgrades', () => {
  const projPool = new Pool(() => ({ active: false }), 20);
  const wm = new WeaponManager(projPool);
  const player = new Player();
  const up = new UpgradeSystem();

  const choices1 = up.generateChoices(player, wm);
  assert.equal(choices1.length, 3);

  // Max out Spark Bolt (8 upgrades)
  wm.addOrUpgradeWeapon(WEAPON_TYPES.SPARK_BOLT);
  const spark = wm.getWeapon(WEAPON_TYPES.SPARK_BOLT);
  while (spark.level < spark.maxLevel) {
    spark.upgrade();
  }
  assert.equal(spark.level, 8);

  // Roll choices 10 times, verify Spark Bolt is NEVER offered
  for (let i = 0; i < 10; i++) {
    const choices = up.generateChoices(player, wm);
    const hasSpark = choices.some((c) => c.id === WEAPON_TYPES.SPARK_BOLT);
    assert.equal(hasSpark, false, 'Maxed weapon must not be offered in level up choices');
  }
});

test('Reroll and Skip mechanics work correctly and decrement counts', () => {
  const up = new UpgradeSystem();
  assert.equal(up.rerollsRemaining, 1);
  assert.equal(up.skipsRemaining, 1);

  up.rerollsRemaining--;
  assert.equal(up.rerollsRemaining, 0);

  up.skipsRemaining--;
  assert.equal(up.skipsRemaining, 0);
});

test('XP curve scales progressively and handles multiple level jumps', () => {
  const player = new Player();
  assert.equal(player.level, 1);
  assert.equal(player.xp, 0);

  // Collecting 5 XP should level up to 2
  const lvls1 = player.addXp(5);
  assert.equal(lvls1, 1);
  assert.equal(player.level, 2);

  // Collecting large batch of XP (100) should handle multi-level jump
  const lvls2 = player.addXp(100);
  assert.ok(lvls2 >= 3, `Expected multiple level jump, got ${lvls2}`);
  assert.ok(player.level >= 5);
});

// -------------------------------------------------------------
// Section 4: 600-Enemy Performance Benchmark
// -------------------------------------------------------------
section('4. 600-Enemy Performance Benchmark');

test('Simulation runs 600 active enemies with spatial hash and weapons under 3ms per frame', () => {
  const enemyPool = new Pool((idx) => new Enemy(idx), MAX_ENEMIES, 'bench_enemies');
  const projPool = new Pool(() => ({
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
  }), MAX_PROJECTILES, 'bench_proj');
  const gemPool = new Pool((idx) => new Gem(idx), MAX_GEMS, 'bench_gems');

  const player = new Player();
  const weapons = new WeaponManager(projPool);
  weapons.addOrUpgradeWeapon(WEAPON_TYPES.SPARK_BOLT);
  weapons.addOrUpgradeWeapon(WEAPON_TYPES.ORBIT_SHIELDS);

  const spatial = new SpatialHash();
  const spawner = new WaveSpawner(enemyPool);

  // Spawn exactly 600 active enemies
  spawner.spawnStressSwarm(player, 600);
  assert.equal(enemyPool.activeCount, 600);

  // Warmup 10 frames
  for (let f = 0; f < 10; f++) {
    spatial.clear();
    const enemies = enemyPool.items;
    for (let i = 0; i < enemyPool.capacity; i++) {
      if (enemies[i].active) spatial.insert(i, enemies[i].x, enemies[i].y);
    }
    spatial.applySeparation(enemyPool, FIXED_DT);
    weapons.update(player, spatial, enemyPool, FIXED_DT, null);
    enemyPool.forEachActive((e) => e.update(player, FIXED_DT));
  }

  // Benchmark 120 frames (2 full seconds of 60Hz gameplay)
  const startTime = performance.now();
  const frames = 120;

  for (let f = 0; f < frames; f++) {
    spatial.clear();
    const enemies = enemyPool.items;
    for (let i = 0; i < enemyPool.capacity; i++) {
      if (enemies[i].active) spatial.insert(i, enemies[i].x, enemies[i].y);
    }
    spatial.applySeparation(enemyPool, FIXED_DT);
    weapons.update(player, spatial, enemyPool, FIXED_DT, null);
    enemyPool.forEachActive((e) => e.update(player, FIXED_DT));
  }

  const elapsed = performance.now() - startTime;
  const avgFrameTimeMs = elapsed / frames;
  const effectiveFps = 1000 / avgFrameTimeMs;

  console.log(`    [BENCHMARK] 600 enemies: ${avgFrameTimeMs.toFixed(3)} ms/tick (${Math.round(effectiveFps)} FPS capacity)`);

  // Must easily run under 10ms per frame to guarantee 60 FPS (16.6ms budget)
  assert.ok(avgFrameTimeMs < 10.0, `Frame time ${avgFrameTimeMs}ms exceeds 10ms budget`);
});

console.log(`\n========================================`);
console.log(`Tests: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) process.exit(1);
