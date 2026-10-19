/**
 * Swarm — Main Entrypoint & Responsive Canvas Scaling
 */

import { GAME_W, GAME_H } from './constants.js';
import { Game } from './game.js';
import { Renderer } from './render.js';
import { UIManager } from './ui.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const container = document.getElementById('game-container');

  // Set internal resolution
  canvas.width = GAME_W;
  canvas.height = GAME_H;

  // Initialize engine
  const game = new Game(canvas);
  const renderer = new Renderer(canvas);
  const ui = new UIManager(game);
  game.ui = ui;

  // Letterbox responsive scaling
  function resizeCanvas() {
    const windowW = window.innerWidth;
    const windowH = window.innerHeight;
    const scale = Math.min(windowW / GAME_W, windowH / GAME_H);

    const targetW = Math.floor(GAME_W * scale);
    const targetH = Math.floor(GAME_H * scale);

    container.style.width = `${targetW}px`;
    container.style.height = `${targetH}px`;
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Test / Benchmark hook
  window.__swarm = {
    game,
    renderer,
    ui,
    startRun: () => game.startRun(),
    spawnStressSwarm: (count = 600) => game.waveSpawner.spawnStressSwarm(game.player, count),
    getFps: () => game.fps,
    getActiveCounts: () => ({
      enemies: game.enemyPool.activeCount,
      projectiles: game.projectilePool.activeCount,
      gems: game.gemPool.activeCount
    })
  };

  // Main Animation Loop
  let lastTime = performance.now();

  function loop(currentTime) {
    const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;

    // Tick game simulation
    game.tick(dt);

    // Render frame
    renderer.draw(game);

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
});
