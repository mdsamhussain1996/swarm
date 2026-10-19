/**
 * Swarm — Input Controller
 * Supports Keyboard (WASD / Arrows), Floating Virtual Joystick (touch left 2/3),
 * Gamepad API, and Pause toggling.
 */

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};

    // Direction vector output (-1 to 1)
    this.dirX = 0;
    this.dirY = 0;

    // Floating Joystick State
    this.touchId = null;
    this.joyActive = false;
    this.joyBaseX = 0;
    this.joyBaseY = 0;
    this.joyCurrX = 0;
    this.joyCurrY = 0;
    this.joyRadius = 50;
    this.joyDeadzone = 0.12;

    // Pause callbacks
    this.onPause = null;

    this.bindEvents();
  }

  bindEvents() {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (typeof this.onPause === 'function') {
          this.onPause();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Tab visibility & window blur
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && typeof this.onPause === 'function') {
        this.onPause();
      }
    });

    window.addEventListener('blur', () => {
      if (typeof this.onPause === 'function') {
        this.onPause();
      }
    });

    // Touch events for floating virtual joystick on left 2/3 of screen
    window.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    window.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    window.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
    window.addEventListener('touchcancel', (e) => this.handleTouchEnd(e), { passive: false });
  }

  handleTouchStart(e) {
    if (this.joyActive) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      // Check if touch is on the left 2/3 of viewport
      if (touch.clientX < window.innerWidth * 0.67) {
        this.touchId = touch.identifier;
        this.joyActive = true;
        this.joyBaseX = touch.clientX;
        this.joyBaseY = touch.clientY;
        this.joyCurrX = touch.clientX;
        this.joyCurrY = touch.clientY;
        e.preventDefault();
        break;
      }
    }
  }

  handleTouchMove(e) {
    if (!this.joyActive) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === this.touchId) {
        this.joyCurrX = touch.clientX;
        this.joyCurrY = touch.clientY;
        e.preventDefault();
        break;
      }
    }
  }

  handleTouchEnd(e) {
    if (!this.joyActive) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === this.touchId) {
        this.joyActive = false;
        this.touchId = null;
        this.joyBaseX = 0;
        this.joyBaseY = 0;
        this.joyCurrX = 0;
        this.joyCurrY = 0;
        break;
      }
    }
  }

  /**
   * Update and normalize input vectors across all supported devices.
   */
  update() {
    let kx = 0;
    let ky = 0;

    // 1. Keyboard
    if (this.keys['KeyW'] || this.keys['ArrowUp']) ky -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) ky += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) kx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) kx += 1;

    // 2. Touch Joystick
    let jx = 0;
    let jy = 0;
    if (this.joyActive) {
      const dx = this.joyCurrX - this.joyBaseX;
      const dy = this.joyCurrY - this.joyBaseY;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.001) {
        const normDist = Math.min(dist / this.joyRadius, 1.0);
        if (normDist > this.joyDeadzone) {
          const remapped = (normDist - this.joyDeadzone) / (1.0 - this.joyDeadzone);
          jx = (dx / dist) * remapped;
          jy = (dy / dist) * remapped;
        }
      }
    }

    // 3. Gamepad API
    let gx = 0;
    let gy = 0;
    if (typeof navigator !== 'undefined' && navigator.getGamepads) {
      const gamepads = navigator.getGamepads();
      for (let i = 0; i < gamepads.length; i++) {
        const gp = gamepads[i];
        if (gp && gp.connected) {
          // Left Analog Stick
          const ax0 = gp.axes[0] || 0;
          const ax1 = gp.axes[1] || 0;
          const dist = Math.hypot(ax0, ax1);
          if (dist > 0.15) {
            gx = ax0;
            gy = ax1;
          }
          // D-Pad buttons
          if (gp.buttons[12] && gp.buttons[12].pressed) gy = -1;
          if (gp.buttons[13] && gp.buttons[13].pressed) gy = 1;
          if (gp.buttons[14] && gp.buttons[14].pressed) gx = -1;
          if (gp.buttons[15] && gp.buttons[15].pressed) gx = 1;
          break;
        }
      }
    }

    // Composite & normalize
    let fx = kx + jx + gx;
    let fy = ky + jy + gy;
    const len = Math.hypot(fx, fy);
    if (len > 1.0) {
      this.dirX = fx / len;
      this.dirY = fy / len;
    } else {
      this.dirX = fx;
      this.dirY = fy;
    }
  }
}
