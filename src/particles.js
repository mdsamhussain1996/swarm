/**
 * Swarm — Particles & Floating Damage Numbers
 * Capped buffers with zero runtime allocations.
 */

import { MAX_PARTICLES, MAX_DAMAGE_NUMBERS } from './constants.js';

export class ParticleManager {
  constructor() {
    // 1. Particle Buffer
    this.maxParticles = MAX_PARTICLES;
    this.particles = [];
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 3,
        color: '#fff'
      });
    }

    // 2. Floating Damage Number Buffer (capped at 50)
    this.maxTexts = MAX_DAMAGE_NUMBERS;
    this.texts = [];
    for (let i = 0; i < this.maxTexts; i++) {
      this.texts.push({
        active: false,
        x: 0,
        y: 0,
        text: '',
        life: 0,
        maxLife: 0.6,
        color: '#fff',
        scale: 1.0
      });
    }
  }

  reset() {
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles[i].active = false;
    }
    for (let i = 0; i < this.maxTexts; i++) {
      this.texts[i].active = false;
    }
  }

  spawnBurst(x, y, count = 8, color = '#38bdf8', speed = 80) {
    let spawned = 0;
    for (let i = 0; i < this.maxParticles && spawned < count; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        const angle = Math.random() * Math.PI * 2;
        const s = speed * (0.5 + Math.random() * 0.8);
        p.vx = Math.cos(angle) * s;
        p.vy = Math.sin(angle) * s;
        p.maxLife = 0.35 + Math.random() * 0.25;
        p.life = p.maxLife;
        p.size = 2 + Math.random() * 2.5;
        p.color = color;
        spawned++;
      }
    }
  }

  spawnDamageNumber(x, y, damage, isCrit = false) {
    for (let i = 0; i < this.maxTexts; i++) {
      const t = this.texts[i];
      if (!t.active) {
        t.active = true;
        t.x = x + (Math.random() - 0.5) * 16;
        t.y = y - 10;
        t.text = String(damage);
        t.maxLife = 0.55;
        t.life = t.maxLife;
        t.color = isCrit ? '#facc15' : '#ffffff';
        t.scale = isCrit ? 1.3 : 1.0;
        break;
      }
    }
  }

  update(dt) {
    // Update particles
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (p.active) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
        }
      }
    }

    // Update damage numbers
    for (let i = 0; i < this.maxTexts; i++) {
      const t = this.texts[i];
      if (t.active) {
        t.y -= 35 * dt; // float upward
        t.life -= dt;
        if (t.life <= 0) {
          t.active = false;
        }
      }
    }
  }
}
