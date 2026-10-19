# SWARM

An original high-performance survivor-arena browser game created by **Dr. Md Samshad Hussain Ansari**.

> **Live Game:** [https://mdsamhussain1996.github.io/swarm/](https://mdsamhussain1996.github.io/swarm/)

---

## Overview

In **SWARM**, the hero auto-attacks while the player focuses entirely on dodging, positioning, and collecting XP gems dropped by defeated swarms. As waves escalate from gentle skirmishes into massive mathematical swarms of hundreds of enemies, every level-up presents a choice of 3 upgrades to customize your build.

All characters, enemy designs, weapons, mechanics, and audio are completely original.

---

## Key Features

- **Extreme Performance Architecture**:
  - Handles **600+ enemies, 300+ projectiles, and 400+ gems** on screen at a rock-solid **60 FPS** even on mobile CPU throttling.
  - **Zero heap allocation** in the game loop through pre-allocated typed array object pools.
  - **Uniform-Grid Spatial Hash** ($O(1)$ cell lookups) for instant broadphase collisions and proximity targeting.
  - **Boids-style separation pass** computed via spatial grid to allow organic flocking without $O(N^2)$ slowdowns.
  - **Offscreen sprite baking**: All procedural pixel/vector art is pre-rendered once to offscreen canvases at startup.
- **Hero & Weapons**:
  - **Nova** (Star Mage): Auto-casts *Spark Bolt* with +10% projectile velocity.
  - Weapons: *Spark Bolt* (auto-aiming plasma bolts) and *Orbit Shields* (spinning defensive barrier orbs).
  - Passive items: *Force Focus* (+might), *Quick Foot* (+speed), *Iron Shell* (+armor), *Magnetic Charm* (+pickup radius), and *Vitality Surge* (+max HP).
- **Controls**:
  - **Keyboard**: WASD / Arrow keys.
  - **Touchscreen / Phone**: Floating virtual joystick anywhere on the left 2/3 of the screen.
  - **Gamepad**: Left analog stick and D-pad via standard Gamepad API.
  - **Pause**: `P` / `Esc` key or when the browser tab loses focus.
- **Synthesized Audio**:
  - All music and sound effects are generated procedurally on-the-fly using the Web Audio API — zero external sound files.
  - Ascending pentatonic pitch streaks on rapid XP gem collection.

---

## Phase 1 Implementation Status

- [x] **Core Prototype**: Movement, floating virtual joystick, and gamepad support.
- [x] **Hero**: Nova (4-frame walk animation, starry cape, spark staff, hit flash, i-frames).
- [x] **Weapons**: Spark Bolt (auto-targeting, piercing) and Orbit Shields (rotating contact barrier).
- [x] **Enemies**: Blobs (slow swarmers), Bats (fast flankers), and Brutes (armored heavy tanks).
- [x] **Gems & Magnet**: Blue (1 XP), Green (5 XP), and Purple (25 XP) with acceleration physics.
- [x] **Level-Up System**: Choice of 3 randomized upgrade cards, level scaling, Reroll and Skip mechanics.
- [x] **Performance**: Zero-allocation pools + spatial hash tested with 600 active enemies ($< 0.1\text{ ms/tick}$).
- [x] **UI & HUD**: XP progress bar, timer, health bar, weapon loadout, game over / results breakdown chart.
- [x] **Credits**: "Made by Dr. Md Samshad Hussain Ansari".
- [x] **Automated Tests**: 8 unit & benchmark test suites passing (`npm test`).

---

## Local Development

To run the game locally:

```bash
# Clone the repository
git clone https://github.com/mdsamhussain1996/swarm.git
cd swarm

# Start any static HTTP server (e.g. Python or Node)
python3 -m http.server 8000

# Open in your browser
open http://localhost:8000
```

To run the automated test suite:

```bash
npm test
```

---

## License

This project is licensed under the [MIT License](LICENSE).  
Copyright (c) 2026 **Dr. Md Samshad Hussain Ansari**.
