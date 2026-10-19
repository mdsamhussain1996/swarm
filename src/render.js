/**
 * Swarm — Procedural Canvas 2D Renderer
 * All sprites pre-rendered once to offscreen canvases for blazing-fast 60 FPS performance.
 * Offscreen culling, letterboxing, and camera look-ahead.
 */

import { GAME_W, GAME_H, WORLD_W, WORLD_H, ENEMY_TYPES, GEM_TYPES } from './constants.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Camera
    this.camX = 0;
    this.camY = 0;

    // Sprite Cache
    this.sprites = {};
    this.bakeSprites();
  }

  /**
   * Pre-render all procedural art into offscreen canvases once at startup.
   */
  bakeSprites() {
    this.sprites.hero = this.bakeHeroWalkFrames();
    this.sprites.blob = this.bakeBlobSprite();
    this.sprites.bat = this.bakeBatSprite();
    this.sprites.brute = this.bakeBruteSprite();
    this.sprites.sparkBolt = this.bakeSparkBoltSprite();
    this.sprites.orbitShield = this.bakeOrbitShieldSprite();
    this.sprites.gems = {
      blue: this.bakeGemSprite(GEM_TYPES.BLUE.color, 16),
      green: this.bakeGemSprite(GEM_TYPES.GREEN.color, 18),
      purple: this.bakeGemSprite(GEM_TYPES.PURPLE.color, 22)
    };
    this.sprites.groundTile = this.bakeGroundTile();
  }

  createOffscreenCanvas(w, h) {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    return cv;
  }

  // --- Hero: Nova Pre-Rendering (4 walk frames + flash) ---
  bakeHeroWalkFrames() {
    const frames = [];
    const size = 48;
    for (let f = 0; f < 4; f++) {
      const cv = this.createOffscreenCanvas(size, size);
      const ctx = cv.getContext('2d');
      const cx = size / 2;
      const cy = size / 2;

      ctx.save();
      ctx.translate(cx, cy);

      const bobY = (f === 1 || f === 3) ? -2 : 0;
      const legOffset = (f === 1) ? 3 : (f === 3 ? -3 : 0);

      // 1. Cape
      ctx.fillStyle = '#4338ca';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-8, -4 + bobY);
      ctx.lineTo(8, -4 + bobY);
      ctx.lineTo(11, 14 + bobY);
      ctx.lineTo(-11, 14 + bobY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 2. Legs / Boots
      ctx.fillStyle = '#312e81';
      ctx.fillRect(-6 + legOffset, 10 + bobY, 4, 6);
      ctx.fillRect(2 - legOffset, 10 + bobY, 4, 6);

      // 3. Wizard Robe
      ctx.fillStyle = '#6366f1';
      ctx.beginPath();
      ctx.moveTo(-7, -4 + bobY);
      ctx.lineTo(7, -4 + bobY);
      ctx.lineTo(9, 11 + bobY);
      ctx.lineTo(-9, 11 + bobY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Golden belt buckle
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-2.5, 4 + bobY, 5, 3);

      // 4. Head / Face
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(0, -9 + bobY, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Eyes
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(1, -10 + bobY, 2, 2.5);

      // 5. Star Mage Hood
      ctx.fillStyle = '#4f46e5';
      ctx.beginPath();
      ctx.moveTo(-8, -9 + bobY);
      ctx.lineTo(0, -18 + bobY);
      ctx.lineTo(8, -9 + bobY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Star gem on hood
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(0, -12 + bobY, 2.2, 0, Math.PI * 2);
      ctx.fill();

      // 6. Spark Staff
      ctx.fillStyle = '#78350f';
      ctx.fillRect(8, -14 + bobY, 2.5, 26);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(9.25, -15 + bobY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();
      frames.push(cv);
    }
    return frames;
  }

  // --- Enemy: Blob Pre-Rendering ---
  bakeBlobSprite() {
    const size = 36;
    const cv = this.createOffscreenCanvas(size, size);
    const ctx = cv.getContext('2d');
    const cx = size / 2, cy = size / 2;

    ctx.save();
    ctx.translate(cx, cy);

    // Dark outline
    ctx.strokeStyle = '#064e3b';
    ctx.lineWidth = 2.5;

    // Slime body
    const grad = ctx.createRadialGradient(-2, -3, 2, 0, 0, 14);
    grad.addColorStop(0, '#86efac');
    grad.addColorStop(0.6, '#22c55e');
    grad.addColorStop(1, '#15803d');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.ellipse(0, 1, 13, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Specular shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.ellipse(-4, -4, 4, 2.5, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Angry eyes
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-4, 0, 2.2, 0, Math.PI * 2);
    ctx.arc(4, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.fillRect(-5, -1.2, 1, 1);
    ctx.fillRect(3, -1.2, 1, 1);

    ctx.restore();
    return cv;
  }

  // --- Enemy: Bat Pre-Rendering ---
  bakeBatSprite() {
    const size = 36;
    const cv = this.createOffscreenCanvas(size, size);
    const ctx = cv.getContext('2d');
    const cx = size / 2, cy = size / 2;

    ctx.save();
    ctx.translate(cx, cy);

    ctx.strokeStyle = '#450a0a';
    ctx.lineWidth = 2;

    // Crimson Wings
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(-3, -2);
    ctx.lineTo(-15, -7);
    ctx.lineTo(-11, 6);
    ctx.lineTo(-4, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(3, -2);
    ctx.lineTo(15, -7);
    ctx.lineTo(11, 6);
    ctx.lineTo(4, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bat Head & Body
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Pointy ears
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.moveTo(-5, -5);
    ctx.lineTo(-7, -11);
    ctx.lineTo(-2, -7);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(5, -5);
    ctx.lineTo(7, -11);
    ctx.lineTo(2, -7);
    ctx.fill();

    // Glowing eyes
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-3, -2, 2, 2);
    ctx.fillRect(1, -2, 2, 2);

    ctx.restore();
    return cv;
  }

  // --- Enemy: Brute Pre-Rendering ---
  bakeBruteSprite() {
    const size = 56;
    const cv = this.createOffscreenCanvas(size, size);
    const ctx = cv.getContext('2d');
    const cx = size / 2, cy = size / 2;

    ctx.save();
    ctx.translate(cx, cy);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;

    // Heavy Stone Golem Body
    const grad = ctx.createLinearGradient(0, -20, 0, 20);
    grad.addColorStop(0, '#64748b');
    grad.addColorStop(1, '#334155');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.roundRect(-18, -18, 36, 36, 6);
    ctx.fill();
    ctx.stroke();

    // Spiked shoulder armor
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(-18, -12);
    ctx.lineTo(-24, -4);
    ctx.lineTo(-18, 4);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(18, -12);
    ctx.lineTo(24, -4);
    ctx.lineTo(18, 4);
    ctx.fill();
    ctx.stroke();

    // Glowing Core
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(0, 2, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Menacing eye visor
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-8, -8, 16, 3.5);

    ctx.restore();
    return cv;
  }

  // --- Projectiles & Shields ---
  bakeSparkBoltSprite() {
    const size = 28;
    const cv = this.createOffscreenCanvas(size, size);
    const ctx = cv.getContext('2d');
    const cx = size / 2, cy = size / 2;

    // Glowing cyan plasma orb
    const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, 12);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.35, '#38bdf8');
    grad.addColorStop(0.75, 'rgba(14, 165, 233, 0.4)');
    grad.addColorStop(1, 'transparent');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    return cv;
  }

  bakeOrbitShieldSprite() {
    const size = 36;
    const cv = this.createOffscreenCanvas(size, size);
    const ctx = cv.getContext('2d');
    const cx = size / 2, cy = size / 2;

    // Runic energy disc
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;

    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 14);
    grad.addColorStop(0, '#fde047');
    grad.addColorStop(0.65, '#eab308');
    grad.addColorStop(1, '#ca8a04');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cross rune
    ctx.strokeStyle = '#fef9c3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy);
    ctx.lineTo(cx + 7, cy);
    ctx.moveTo(cx, cy - 7);
    ctx.lineTo(cx, cy + 7);
    ctx.stroke();

    return cv;
  }

  bakeGemSprite(color, size) {
    const cv = this.createOffscreenCanvas(size, size);
    const ctx = cv.getContext('2d');
    const cx = size / 2, cy = size / 2;
    const r = (size - 4) / 2;

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.fillStyle = color;

    // Diamond gem polygon
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Specular highlight facet
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.moveTo(cx, cy - r + 2);
    ctx.lineTo(cx + r * 0.45, cy);
    ctx.lineTo(cx, cy - 1);
    ctx.lineTo(cx - r * 0.45, cy);
    ctx.closePath();
    ctx.fill();

    return cv;
  }

  bakeGroundTile() {
    const size = 128;
    const cv = this.createOffscreenCanvas(size, size);
    const ctx = cv.getContext('2d');

    // Deep slate background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, size, size);

    // Subtle arena grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, size, size);

    // Decorative ground details (cobblestone & moss)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(24, 28, 16, 12);
    ctx.fillRect(78, 86, 22, 14);

    ctx.fillStyle = '#14532d'; // Dark moss accent
    ctx.fillRect(44, 70, 8, 6);
    ctx.fillRect(92, 32, 6, 6);

    return cv;
  }

  /**
   * Main render pass for the frame.
   */
  draw(game) {
    const ctx = this.ctx;
    const player = game.player;

    // Smooth Camera with look-ahead
    const targetCamX = player.x - GAME_W / 2 + player.vx * 0.15;
    const targetCamY = player.y - GAME_H / 2 + player.vy * 0.15;
    this.camX += (targetCamX - this.camX) * 0.12;
    this.camY += (targetCamY - this.camY) * 0.12;

    // Clamp camera within world bounds
    this.camX = Math.max(0, Math.min(WORLD_W - GAME_W, this.camX));
    this.camY = Math.max(0, Math.min(WORLD_H - GAME_H, this.camY));

    const cx = Math.round(this.camX);
    const cy = Math.round(this.camY);

    ctx.clearRect(0, 0, GAME_W, GAME_H);

    ctx.save();
    ctx.translate(-cx, -cy);

    // 1. Tiled Ground
    const startCol = Math.floor(cx / 128);
    const endCol = Math.ceil((cx + GAME_W) / 128);
    const startRow = Math.floor(cy / 128);
    const endRow = Math.ceil((cy + GAME_H) / 128);

    for (let r = startRow; r < endRow; r++) {
      for (let c = startCol; c < endCol; c++) {
        ctx.drawImage(this.sprites.groundTile, c * 128, r * 128);
      }
    }

    // Arena boundary border
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, WORLD_W - 4, WORLD_H - 4);

    // 2. XP Gems (with offscreen culling)
    const margin = 40;
    const minX = cx - margin, maxX = cx + GAME_W + margin;
    const minY = cy - margin, maxY = cy + GAME_H + margin;

    game.gemPool.forEachActive((gem) => {
      if (gem.x < minX || gem.x > maxX || gem.y < minY || gem.y > maxY) return;

      let spr = this.sprites.gems.blue;
      if (gem.gemType === GEM_TYPES.GREEN) spr = this.sprites.gems.green;
      else if (gem.gemType === GEM_TYPES.PURPLE) spr = this.sprites.gems.purple;

      ctx.drawImage(spr, gem.x - spr.width / 2, gem.y - spr.height / 2);
    });

    // 3. Enemies (with offscreen culling)
    const blobSpr = this.sprites.blob;
    const batSpr = this.sprites.bat;
    const bruteSpr = this.sprites.brute;

    game.enemyPool.forEachActive((enemy) => {
      if (enemy.x < minX || enemy.x > maxX || enemy.y < minY || enemy.y > maxY) return;

      let spr = blobSpr;
      if (enemy.type === ENEMY_TYPES.BAT) spr = batSpr;
      else if (enemy.type === ENEMY_TYPES.BRUTE) spr = bruteSpr;

      ctx.save();
      ctx.translate(enemy.x, enemy.y);

      // Flash white on hit
      if (enemy.hitFlashTimer > 0) {
        ctx.filter = 'brightness(2.2) contrast(1.5)';
      }

      ctx.drawImage(spr, -spr.width / 2, -spr.height / 2);
      ctx.restore();
    });

    // 4. Orbit Shields
    const orbitWeapon = game.weaponManager.getWeapon('orbit_shields');
    if (orbitWeapon && orbitWeapon.count > 0) {
      const shieldSpr = this.sprites.orbitShield;
      for (let i = 0; i < orbitWeapon.count; i++) {
        const orb = orbitWeapon.orbs[i];
        ctx.drawImage(shieldSpr, orb.x - shieldSpr.width / 2, orb.y - shieldSpr.height / 2);
      }
    }

    // 5. Player (Nova)
    ctx.save();
    ctx.translate(player.x, player.y);

    if (player.facing === -1) {
      ctx.scale(-1, 1);
    }

    // i-frame flashing
    if (player.invulnerableTimer > 0 && Math.floor(player.invulnerableTimer * 20) % 2 === 0) {
      ctx.globalAlpha = 0.55;
    }

    const walkFrame = Math.floor(player.walkTimer) % 4;
    const heroSpr = this.sprites.hero[walkFrame];
    ctx.drawImage(heroSpr, -heroSpr.width / 2, -heroSpr.height / 2);

    ctx.restore();

    // 6. Projectiles (Spark Bolts)
    const boltSpr = this.sprites.sparkBolt;
    game.projectilePool.forEachActive((proj) => {
      ctx.drawImage(boltSpr, proj.x - boltSpr.width / 2, proj.y - boltSpr.height / 2);
    });

    // 7. Particles
    const particles = game.particleManager.particles;
    for (let i = 0; i < game.particleManager.maxParticles; i++) {
      const p = particles[i];
      if (p.active) {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 8. Damage Numbers
    const texts = game.particleManager.texts;
    ctx.font = 'bold 15px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < game.particleManager.maxTexts; i++) {
      const t = texts[i];
      if (t.active) {
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, t.x, t.y);
      }
    }

    ctx.restore();

    // 9. Floating Virtual Joystick on Canvas (Touch screen feedback)
    if (game.input.joyActive) {
      const j = game.input;
      // Convert screen coords to canvas coords
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = GAME_W / rect.width;
      const scaleY = GAME_H / rect.height;
      const jbx = (j.joyBaseX - rect.left) * scaleX;
      const jby = (j.joyBaseY - rect.top) * scaleY;
      const jcx = (j.joyCurrX - rect.left) * scaleX;
      const jcy = (j.joyCurrY - rect.top) * scaleY;

      // Base circle
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(jbx, jby, j.joyRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Stick handle
      ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.beginPath();
      ctx.arc(jcx, jcy, 20, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
