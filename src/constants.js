/**
 * Swarm — Constants & Global Configurations
 * Fixed internal resolution: 960x540
 */

export const GAME_W = 960;
export const GAME_H = 540;
export const WORLD_W = 3200;
export const WORLD_H = 3200;
export const FIXED_DT = 1 / 60;

// Maximum entity capacities for zero-allocation pools
export const MAX_ENEMIES = 1200;
export const MAX_PROJECTILES = 800;
export const MAX_GEMS = 1000;
export const MAX_PARTICLES = 600;
export const MAX_DAMAGE_NUMBERS = 50; // Capped for readability and speed

// Spatial Hash Configuration
export const SPATIAL_CELL_SIZE = 64;
export const SPATIAL_COLS = Math.ceil(WORLD_W / SPATIAL_CELL_SIZE);
export const SPATIAL_ROWS = Math.ceil(WORLD_H / SPATIAL_CELL_SIZE);

// Enemy Types
export const ENEMY_TYPES = {
  BLOB: 'blob',
  BAT: 'bat',
  BRUTE: 'brute'
};

// XP Gem Values and Colors
export const GEM_TYPES = {
  BLUE: { value: 1, color: '#38bdf8', glow: 'rgba(56, 189, 248, 0.4)', radius: 5 },
  GREEN: { value: 5, color: '#4ade80', glow: 'rgba(74, 222, 128, 0.4)', radius: 6.5 },
  PURPLE: { value: 25, color: '#c084fc', glow: 'rgba(192, 132, 252, 0.5)', radius: 8 }
};

// Weapons Config
export const WEAPON_TYPES = {
  SPARK_BOLT: 'spark_bolt',
  ORBIT_SHIELDS: 'orbit_shields'
};

// UI & Theme
export const CREDITS_TEXT = 'Made by Dr. Md Samshad Hussain Ansari';
